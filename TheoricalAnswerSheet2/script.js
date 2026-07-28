// ==========================================
// 第二次理論測驗：答案卷邏輯
// 10 題填充題，每題 8 分，滿分 80 分。
// 不提供逐題檢驗按鈕，僅在交卷時一次性批改。
// ==========================================

const ANSWER_KEY = {
    q1: { type: 'number', value: 900 },
    q2: { type: 'number', value: 72762 },
    q3: { type: 'text', value: 'Na' },
    q4: { type: 'number', value: 10003 },
    q5: { type: 'number', value: 179 },
    q6: { type: 'number', value: 194 },
    q7: { type: 'text', value: 'A' },
    q8: { type: 'text', value: '我愛六七' },
    q9: { type: 'number', value: 170 },
    q10: { type: 'number', value: 1819 }
};

const MAX_POINTS_PER_QUESTION = 8;

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

window.submitExam = submitExam;
window.closeAlertModal = closeAlertModal;

const firebaseConfig = {
    apiKey: "AIzaSyAZ7cCQlXh8oiNzwnT2LL07KPt5TMaI2d8",
    authDomain: "dhjhweb.firebaseapp.com",
    projectId: "dhjhweb",
    storageBucket: "dhjhweb.firebasestorage.app",
    messagingSenderId: "763721572642",
    appId: "1:763721572642:web:fee3751366cba01bc0c57b",
    measurementId: "G-9CM3NBLLLS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 🚨 測驗時間與解鎖設定
// ==========================================
const EXAM_CONFIG2 = {
    startTime: "16:10",
    endTime: "16:40",
    durationMinutes: 30,
    enableTimeCheck: true
};

let authWarningDiv = null;
let waitingTimerInterval = null;
let examTimerInterval = null;

onAuthStateChanged(auth, (user) => {
    if (user && !user.isAnonymous) {
        if (authWarningDiv) {
            authWarningDiv.remove();
            authWarningDiv = null;
        }
        document.body.style.overflow = 'auto';

        window.currentStudentId = user.uid;
        window.currentStudentName = user.displayName || user.email.split('@')[0];

        const studentInfoDisplay = document.getElementById('student_info_display');
        if (studentInfoDisplay) {
            studentInfoDisplay.innerText = `考生：${window.currentStudentName}`;
        }

        loadDraft();
        setupAutoSave();
        setupNumericFilters();

        const waitingSection = document.getElementById('waiting_section');
        const examSection = document.getElementById('exam_section');

        if (EXAM_CONFIG2.enableTimeCheck) {
            const now = new Date();
            const [startH, startM] = EXAM_CONFIG2.startTime.split(':').map(Number);
            const startDate = new Date();
            startDate.setHours(startH, startM, 0, 0);

            if (now < startDate) {
                if (examSection) {
                    examSection.classList.add('hidden');
                    examSection.style.display = 'none';
                }
                if (waitingSection) {
                    waitingSection.classList.remove('hidden');
                    waitingSection.style.display = 'block';
                }

                startWaitingTimer(startDate);
                return;
            }
        }

        if (waitingSection) {
            waitingSection.classList.add('hidden');
            waitingSection.style.display = 'none';
        }
        if (examSection) {
            examSection.classList.remove('hidden');
            examSection.style.display = 'block';
        }
        startExamTimer();

    } else {
        if (!authWarningDiv) {
            authWarningDiv = document.createElement('div');
            authWarningDiv.style.cssText = 'position: fixed; inset: 0; z-index: 9999; display: flex; justify-content: center; align-items: center; background-color: #f8f9fa; font-family: sans-serif; color: #d93025; text-align: center;';
            authWarningDiv.innerHTML = `
                <div>
                    <h1 style="font-size: 48px; margin-bottom: 10px;">🛡️</h1>
                    <h2>拒絕存取</h2>
                    <p>正在同步登入狀態...<br>若長時間卡住，請確認您已從主網站右上角登入系統。</p>
                </div>
            `;
            document.body.appendChild(authWarningDiv);
            document.body.style.overflow = 'hidden';
        }
    }
});

// ==========================================
// ⏳ 等候室：開考倒數計時器
// ==========================================
function startWaitingTimer(startDate) {
    const countdownDisplay = document.getElementById('countdown_timer');
    if (waitingTimerInterval) clearInterval(waitingTimerInterval);

    updateWaitingDisplay();
    waitingTimerInterval = setInterval(updateWaitingDisplay, 1000);

    function updateWaitingDisplay() {
        const now = new Date();
        const diffMs = startDate.getTime() - now.getTime();

        if (diffMs <= 0) {
            clearInterval(waitingTimerInterval);

            const waitingSection = document.getElementById('waiting_section');
            const examSection = document.getElementById('exam_section');
            if (waitingSection) {
                waitingSection.classList.add('hidden');
                waitingSection.style.display = 'none';
            }
            if (examSection) {
                examSection.classList.remove('hidden');
                examSection.style.display = 'block';
            }

            startExamTimer();
            return;
        }

        const totalSeconds = Math.floor(diffMs / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (countdownDisplay) {
            countdownDisplay.innerText = h > 0
                ? `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }
}

// ==========================================
// ⏱️ 測驗區：動態倒數與強制交卷機制
// ==========================================
function startExamTimer() {
    if (examTimerInterval) clearInterval(examTimerInterval);

    const now = new Date();

    const hardDeadline = new Date();
    const [endH, endM] = EXAM_CONFIG2.endTime.split(':').map(Number);
    hardDeadline.setHours(endH, endM, 0, 0);

    const startDate = new Date();
    const [startH, startM] = EXAM_CONFIG2.startTime.split(':').map(Number);
    startDate.setHours(startH, startM, 0, 0);
    const durationDeadline = new Date(startDate.getTime() + EXAM_CONFIG2.durationMinutes * 60000);

    const finalDeadline = new Date(Math.min(hardDeadline.getTime(), durationDeadline.getTime()));

    if (now >= finalDeadline) {
        forceSubmitExam("考試時間已結束，系統將不予計算成績或自動交卷。");
        return;
    }

    let headerTimerDiv = document.getElementById('exam-timer-header');
    if (!headerTimerDiv) {
        headerTimerDiv = document.createElement('div');
        headerTimerDiv.id = 'exam-timer-header';
        headerTimerDiv.style.cssText = `
            position: absolute; right: 30px; top: 50%; transform: translateY(-50%);
            font-size: 1.25rem; font-weight: bold; color: #1e3a8a;
            font-family: 'Courier New', Courier, monospace; letter-spacing: 2px;
            display: flex; align-items: center; justify-content: center;
            border: 2px solid #1e3a8a; border-radius: 8px; padding: 6px 16px;
            background-color: #f8fafc;
        `;
        const header = document.querySelector('.system-header');
        if (header) {
            header.style.position = 'relative';
            header.appendChild(headerTimerDiv);
        }
    }

    let floatTimerDiv = document.getElementById('exam-timer-float');
    if (!floatTimerDiv) {
        floatTimerDiv = document.createElement('div');
        floatTimerDiv.id = 'exam-timer-float';
        floatTimerDiv.style.cssText = `
            position: fixed; bottom: 30px; right: 30px;
            background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px;
            padding: 12px 20px; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.2);
            z-index: 9999; font-weight: bold; color: #ef4444;
            display: none; align-items: center; justify-content: center;
            font-family: 'Courier New', Courier, monospace; font-size: 24px; letter-spacing: 2px;
            animation: timerPulse2 1s infinite;
        `;
        document.body.appendChild(floatTimerDiv);

        const style = document.createElement('style');
        style.innerHTML = `@keyframes timerPulse2 { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }`;
        document.head.appendChild(style);
    }

    let hasWarned10Min = sessionStorage.getItem('warned10Min_exam2') === 'true';

    examTimerInterval = setInterval(() => {
        const currentTime = new Date();
        const diffMs = finalDeadline.getTime() - currentTime.getTime();

        if (diffMs <= 0) {
            clearInterval(examTimerInterval);
            floatTimerDiv.style.display = 'flex';
            floatTimerDiv.innerHTML = '考試結束';
            headerTimerDiv.style.display = 'none';
            forceSubmitExam("⏰ 考試時間已結束！系統正在為您強制自動交卷！");
            return;
        }

        const totalSeconds = Math.floor(diffMs / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const timeText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        if (totalSeconds <= 600 && !hasWarned10Min) {
            hasWarned10Min = true;
            sessionStorage.setItem('warned10Min_exam2', 'true');
            setTimeout(() => alert("⚠️ 提醒：距離考試結束僅剩最後 10 分鐘！"), 100);
        }

        if (totalSeconds <= 180) {
            headerTimerDiv.style.display = 'none';
            floatTimerDiv.style.display = 'flex';
            floatTimerDiv.innerHTML = timeText;
        } else {
            headerTimerDiv.style.display = 'flex';
            floatTimerDiv.style.display = 'none';
            headerTimerDiv.innerHTML = timeText;
        }
    }, 1000);
}

function forceSubmitExam(msg) {
    alert(msg);
    submitExam();
}

// ==========================================
// 輸入限制：數字題僅允許正整數，且 < 1,000,000
// ==========================================
function setupNumericFilters() {
    Object.keys(ANSWER_KEY).forEach(qId => {
        if (ANSWER_KEY[qId].type !== 'number') return;
        const el = document.getElementById(qId);
        if (!el) return;
        el.addEventListener('input', () => {
            el.value = el.value.replace(/[^0-9]/g, '').slice(0, 6);
        });
    });
}

function setupAutoSave() {
    try {
        const inputs = document.querySelectorAll('#exam_section input');
        inputs.forEach(input => {
            if (!input) return;
            input.addEventListener('input', saveDraft);
        });
    } catch (e) {
        console.error("AutoSave setup failed:", e);
    }
}

function saveDraft() {
    if (!window.currentStudentId) return;
    try {
        const draftData = {
            student_id: window.currentStudentId,
            answers: {}
        };
        Object.keys(ANSWER_KEY).forEach(qId => {
            draftData.answers[qId] = document.getElementById(qId)?.value || "";
        });
        localStorage.setItem('exam2_draft', JSON.stringify(draftData));
    } catch (e) {
        console.error("❌ [存檔發生例外錯誤]:", e);
    }
}

function loadDraft() {
    const saved = localStorage.getItem('exam2_draft');
    if (!saved) return;

    try {
        const draftData = JSON.parse(saved);
        if (draftData.student_id !== window.currentStudentId) return;

        if (draftData.answers) {
            Object.keys(draftData.answers).forEach(qId => {
                const el = document.getElementById(qId);
                if (el && draftData.answers[qId]) el.value = draftData.answers[qId];
            });
        }
    } catch (e) {
        console.error("❌ [讀檔發生例外錯誤]:", e);
    }
}

// ==========================================
// 批改邏輯
// ==========================================
function scoreNumeric(input, correctValue) {
    const trimmed = String(input || "").trim();
    if (!/^[1-9][0-9]*$/.test(trimmed)) return 0;

    const I = Number(trimmed);
    if (!Number.isFinite(I) || I >= 1000000) return 0;

    const A = correctValue;
    const logTerm = 1 - 0.5 * Math.abs(Math.log2(I / A));
    const linTerm = 1 - 0.5 * Math.abs(I - A) / A;
    const raw = Math.max(logTerm, linTerm, 0);
    return MAX_POINTS_PER_QUESTION * raw;
}

function scoreText(input, correctValue) {
    const normalize = (s) => String(s || "").trim().toLowerCase();
    return normalize(input) === normalize(correctValue) ? MAX_POINTS_PER_QUESTION : 0;
}

function showAlert(title, message) {
    let modal = document.getElementById('alert_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'alert_modal';
        modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;";
        modal.innerHTML = `
            <div style="background: var(--surface, #fff); padding: 20px; border-radius: 8px; max-width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 id="alert_title" style="margin-top: 0; color: var(--primary, #000);">${title}</h3>
                <p id="alert_message" style="color: var(--on-surface-default, #333); white-space: pre-wrap; line-height: 1.5; margin-bottom: 20px;">${message}</p>
                <button type="button" onclick="closeAlertModal()" style="padding: 8px 16px; background: var(--primary, #0b57d0); color: #fff; border: none; border-radius: 4px; cursor: pointer;">確定</button>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        const titleEl = document.getElementById('alert_title');
        const msgEl = document.getElementById('alert_message');
        if (titleEl) titleEl.innerText = title;
        if (msgEl) msgEl.innerText = message;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function closeAlertModal() {
    const modal = document.getElementById('alert_modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// ==========================================
// 🏛️ 暑期競標：交卷時自動入帳 pow(第二次理論總分, 4) 點
// 用固定的 transaction doc ID ('theory_test_2') 讓這筆入帳天生具備冪等性。
// ==========================================
async function creditAuctionWallet(uid, totalScore) {
    try {
        const walletRef = doc(db, 'artifacts', 'dhjh-summer-camp', 'users', uid, 'wallet', 'summer_auction');
        const txnRef = doc(db, 'artifacts', 'dhjh-summer-camp', 'users', uid, 'wallet', 'summer_auction', 'transactions', 'theory_test_2');

        await runTransaction(db, async (transaction) => {
            const txnSnap = await transaction.get(txnRef);
            if (txnSnap.exists()) return;

            const walletSnap = await transaction.get(walletRef);
            const currentBalance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;
            const amount = Math.pow(totalScore, 4);
            const newBalance = currentBalance + amount;
            const timestamp = new Date().toISOString();

            transaction.set(walletRef, { balance: newBalance }, { merge: true });
            transaction.set(txnRef, {
                label: 'Theorical Exam 2',
                amount: amount,
                balanceAfter: newBalance,
                timestamp: timestamp
            });
        });
    } catch (e) {
        console.error("競標點數入帳失敗:", e);
    }
}

async function submitExam() {
    const btn = document.getElementById('submit_btn');
    const statusMsg = document.getElementById('status_message');

    if (!window.currentStudentId) {
        showAlert("錯誤", "找不到您的登入身分，請重新整理網頁後再試。");
        return;
    }

    const answers = {};
    const scores = {};
    let totalScore = 0;

    Object.keys(ANSWER_KEY).forEach(qId => {
        const key = ANSWER_KEY[qId];
        const rawValue = document.getElementById(qId)?.value || "";
        answers[qId] = rawValue;

        const earned = key.type === 'number'
            ? scoreNumeric(rawValue, key.value)
            : scoreText(rawValue, key.value);

        scores[qId] = earned;
        totalScore += earned;
    });

    totalScore = Math.round(totalScore * 100) / 100;

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerText = "傳送中...";
        }
        if (statusMsg) {
            statusMsg.innerText = "正在將您的答案與成績上傳至伺服器...";
            statusMsg.style.color = "var(--primary-color)";
        }

        const resultRef = doc(db, 'artifacts', 'dhjh-summer-camp', 'users', window.currentStudentId, 'exam_results', 'theory_test_2');

        await setDoc(resultRef, {
            score: totalScore,
            theory2Scores: scores,
            answers: answers,
            submitTime: new Date().toISOString(),
            studentName: window.currentStudentName || "未知學生"
        }, { merge: true });

        await creditAuctionWallet(window.currentStudentId, totalScore);

        localStorage.setItem('exam2_submitted_' + window.currentStudentId, 'true');
        localStorage.removeItem('exam2_draft');

        const examSection = document.getElementById('exam_section');
        if (examSection) {
            examSection.innerHTML = `
                <div style="text-align:center; padding: 120px 20px;">
                    <h2 style="color: #1f2937; font-size: 2rem; font-weight: bold; margin-bottom: 12px;">交卷成功</h2>
                    <p style="color: #6b7280; font-size: 1.1rem; line-height: 1.6;">
                        您的成績與作答紀錄已安全送出。<br>
                        系統將於 <span id="countdown_timer" style="color: #3b82f6; font-weight: bold; font-size: 1.3rem;">3</span> 秒後為您導向「暑期成績單」...
                    </p>
                </div>
            `;

            let count = 3;
            const countdown = setInterval(() => {
                count--;
                const timerEl = document.getElementById('countdown_timer');
                if (timerEl) timerEl.innerText = count;
                if (count <= 0) {
                    clearInterval(countdown);
                    if (window.parent) {
                        window.parent.postMessage({ action: 'exam2_submitted' }, '*');
                    }
                }
            }, 1000);
        }

        if (statusMsg) {
            statusMsg.innerText = "交卷成功！感謝您的作答。";
            statusMsg.style.color = "var(--positive)";
        }

    } catch (e) {
        console.error("Submit failed:", e);
        if (btn) {
            btn.disabled = false;
            btn.innerText = "確認交卷";
        }
        if (statusMsg) {
            statusMsg.innerText = "交卷失敗，請檢查網路連線後再試一次。";
            statusMsg.style.color = "var(--danger-color)";
        }
        showAlert("錯誤", "傳送失敗，請稍後重試。如果持續失敗，請舉手告監考老師。");
    }
}
