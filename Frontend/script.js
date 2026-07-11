let currentStudentId = null;
let skipConfirm = false;
let currentCheckQid = null;
let currentCheckGroup = null;

// 題庫狀態字典 (包含所有 1-30 題的設定)
const questionStates = {
    q1: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "C" },
    q2: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "A" },
    q3: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "C" },
    q4: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "A" },
    q5: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "D" },
    q6: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "B" },
    q7: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "D" },
    q8: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "A" },
    q9: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "C" },
    q10: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "C" },
    q11: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "B" },
    q12: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "B" },
    q13: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "A" },
    q14: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "A" },
    q15: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "D" },
    q16: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "A" },
    q17: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "D" },
    q18: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "C" },
    q19: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "D" },
    q20: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "D" },

    q21: {
        type: 'chem', attempts: 0, maxPoints: 5, isCorrect: false,
        correctAnswer: {
            reactants: { "Cr2O7^2-": 4, "C4H10O": 1, "H^+": 32 },
            products: { "Cr^3+": 8, "CO2": 4, "H2O": 21 }
        }
    },
    q22: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "D" },
    q231: { type: 'fill-in', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "0.48" },
    q232: { type: 'fill-in', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "2.50" },
    q24: { type: 'mixed', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: { radio: "是", text: "86.4" } },
    q25: { type: 'mixed', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: { radio: "正", text: "360" } },
    q26: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "A" },
    q27: { type: 'mcq', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "C" },
    q28: { type: 'fill-in', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "25" },
    q29: {
        type: 'multi-mcq', attempts: 0, maxPoints: 5, isCorrect: false,
        correctAnswer: ["A", "B", "D", "F", "B"],
        subStates: [
            { isCorrect: false, checkedHistory: [] },
            { isCorrect: false, checkedHistory: [] },
            { isCorrect: false, checkedHistory: [] },
            { isCorrect: false, checkedHistory: [] },
            { isCorrect: false, checkedHistory: [] }
        ]
    },
    q301: { type: 'fill-in', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "0.60" },
    q302: { type: 'fill-in', attempts: 0, maxPoints: 5, isCorrect: false, correctAnswer: "0.80" }
};
// ==========================================
// 模組：系統參數設定 (密碼與時間鎖)
// ==========================================
const EXAM_CONFIG = {
    password: "123",        // 【請在此修改】統一測驗密碼
    startTime: "17:30",     // 【請在此修改】統一開始時間 (24小時制，如 "17:30")
    enableTimeCheck: false   // 是否啟用時間限制 (true: 啟用 / false: 關閉)
};

function verifyLogin() {
    const studentIdEl = document.getElementById('student_id');
    const passwordEl = document.getElementById('password') || document.querySelector('input[type="password"]');
    if (!studentIdEl) return;

    const studentId = studentIdEl.value?.trim();
    if (!studentId) {
        showAlert("系統提示", "請輸入學號");
        return;
    }

    // 強制密碼驗證
    if (passwordEl) {
        const pwd = passwordEl.value?.trim();
        if (pwd !== EXAM_CONFIG.password) {
            showAlert("登入失敗", "測驗密碼錯誤！請確認後再試。");
            return; // 密碼錯誤，直接中斷
        }
    }

    // 登入前檢查是否已經交過卷
    if (localStorage.getItem('exam_submitted_' + studentId) === 'true') {
        showAlert("拒絕存取", `學號 ${studentId} 已經完成本次測驗交卷，無法再次進入作答介面！`);
        return;
    }

    // 【新增】：開考時間閘門 (改為彈出警告框阻擋)
    if (EXAM_CONFIG.enableTimeCheck) {
        const now = new Date();
        const [targetHours, targetMinutes] = EXAM_CONFIG.startTime.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setHours(targetHours, targetMinutes, 0, 0);

        const diffMs = targetDate.getTime() - now.getTime();

        if (diffMs > 0) {
            // 還沒到開考時間，計算剩餘分秒
            const totalSeconds = Math.floor(diffMs / 1000);
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;

            let timeText = h > 0 ? `${h} 小時 ${m} 分 ${s} 秒` : `${m} 分 ${s} 秒`;

            // 呼叫類似密碼錯誤的系統彈窗阻擋登入
            showAlert("⏳ 測驗尚未開始", `統一開考時間為 ${EXAM_CONFIG.startTime}。\n\n距離開考還剩下：${timeText}\n請稍後再重新點擊登入！`);
            return; // 直接中斷，不解鎖畫面
        }
    }

    // 儲存學號至全域變數
    window.currentStudentId = studentId;
    console.log("系統：登入程序觸發");

    // 切換畫面
    const loginSection = document.getElementById('login_section') || document.querySelector('.login-section');
    const examSection = document.getElementById('exam_section');

    if (loginSection) loginSection.style.display = 'none'; // 隱藏登入區
    if (examSection) {
        examSection.style.display = 'block'; // 顯示考卷區
        examSection.classList.remove('hidden');
    }

    // 載入先前的作答暫存 (若有)
    if (typeof loadDraft === 'function') {
        try {
            loadDraft();
        } catch (e) {
            console.error("暫存讀取失敗", e);
        }
    }

    console.log("系統：登入成功，介面已解鎖");
}

function setupAutoSave() {
    try {
        const inputs = document.querySelectorAll('#exam_section input');
        inputs.forEach(input => {
            if (!input) return;
            input.addEventListener('input', saveDraft);
            if (input.type === 'radio' || input.type === 'checkbox') {
                input.addEventListener('change', saveDraft);
            }
        });
    } catch (e) {
        console.error("AutoSave setup failed:", e);
    }
}

function checkAnswerEquivalence(userAns, correctAns) {
    const uStr = String(userAns || "").trim().toLowerCase();
    const cStr = String(correctAns || "").trim().toLowerCase();

    const uNum = Number(uStr);
    const cNum = Number(cStr);

    if (!isNaN(uNum) && !isNaN(cNum) && uStr !== "" && cStr !== "") {
        return uNum === cNum;
    }
    return uStr === cStr;
}

function saveDraft() {
    if (!currentStudentId) return;
    try {
        const getRadioValue = (name) => {
            const el = document.querySelector(`input[name="${name}"]:checked`);
            return el ? el.value : null;
        };

        const getChemZoneData = (zoneId) => {
            const terms = document.getElementById(zoneId)?.querySelectorAll('.chem-term');
            if (!terms) return [];
            return Array.from(terms).map(term => ({
                id: term.id,
                raw: term.getAttribute('data-raw'),
                coeff: term.querySelector('.chem-coeff') ? parseInt(term.querySelector('.chem-coeff').value, 10) || 1 : 1
            }));
        };

        const draftData = {
            student_id: currentStudentId,
            skipConfirm: skipConfirm,
            answers: {},
            q21: {
                pool: getChemZoneData('chem_pool'),
                reactants: getChemZoneData('reactants_zone'),
                products: getChemZoneData('products_zone')
            },
            qStates: questionStates
        };

        Object.keys(questionStates).forEach(qId => {
            if (qId === 'q21') return;
            const qState = questionStates[qId];
            if (qState.type === 'mcq') {
                draftData.answers[qId] = getRadioValue(qId);
            } else if (qState.type === 'fill-in') {
                draftData.answers[qId] = document.getElementById(qId)?.value || "";
            } else if (qState.type === 'mixed') {
                draftData.answers[qId] = {
                    text: document.getElementById(`${qId}_text`)?.value || "",
                    radio: getRadioValue(`${qId}_radio`) || ""
                };
            } else if (qState.type === 'multi-mcq') {
                draftData.answers[qId] = [];
                for (let i = 0; i < qState.correctAnswer.length; i++) {
                    draftData.answers[qId].push(getRadioValue(`${qId}_${i + 1}`));
                }
            }
        });

        localStorage.setItem('exam_draft', JSON.stringify(draftData));
    } catch (e) {
        console.error("Save Draft Failed:", e);
    }
}

function loadDraft() {
    const saved = localStorage.getItem('exam_draft');
    if (saved) {
        try {
            const draftData = JSON.parse(saved);
            if (draftData.student_id === currentStudentId) {

                if (draftData.skipConfirm !== undefined) {
                    skipConfirm = draftData.skipConfirm;
                }

                if (draftData.answers) {
                    Object.keys(draftData.answers).forEach(qId => {
                        const ans = draftData.answers[qId];
                        const qState = questionStates[qId];
                        if (!qState) return;

                        if (qState.type === 'mcq' && ans) {
                            const radio = document.querySelector(`input[name="${qId}"][value="${ans}"]`);
                            if (radio) radio.checked = true;
                        } else if (qState.type === 'fill-in' && ans) {
                            const el = document.getElementById(qId);
                            if (el) el.value = ans;
                        } else if (qState.type === 'mixed' && ans) {
                            const textEl = document.getElementById(`${qId}_text`);
                            if (textEl && ans.text) textEl.value = ans.text;
                            if (ans.radio) {
                                const radio = document.querySelector(`input[name="${qId}_radio"][value="${ans.radio}"]`);
                                if (radio) radio.checked = true;
                            }
                        } else if (qState.type === 'multi-mcq' && Array.isArray(ans)) {
                            ans.forEach((subAns, idx) => {
                                if (subAns) {
                                    const radio = document.querySelector(`input[name="${qId}_${idx + 1}"][value="${subAns}"]`);
                                    if (radio) radio.checked = true;
                                }
                            });
                        }
                    });
                }

                if (draftData.q21 && document.getElementById('chem_pool')) {
                    document.getElementById('chem_pool').innerHTML = '<div class="chem-pool-placeholder">素材區 (產生的化學式將暫存於此)</div>';
                    document.getElementById('reactants_zone').innerHTML = '';
                    document.getElementById('products_zone').innerHTML = '';

                    draftData.q21.pool?.forEach(item => {
                        if (typeof restoreChemChip === 'function') restoreChemChip(item, 'chem_pool');
                    });
                    draftData.q21.reactants?.forEach(item => {
                        if (typeof restoreChemChip === 'function') restoreChemChip(item, 'reactants_zone');
                    });
                    draftData.q21.products?.forEach(item => {
                        if (typeof restoreChemChip === 'function') restoreChemChip(item, 'products_zone');
                    });
                }

                if (draftData.qStates) {
                    Object.keys(draftData.qStates).forEach(qId => {
                        if (questionStates[qId]) {
                            questionStates[qId].attempts = draftData.qStates[qId].attempts || 0;
                            questionStates[qId].maxPoints = draftData.qStates[qId].maxPoints ?? 5;
                            questionStates[qId].isCorrect = draftData.qStates[qId].isCorrect || false;

                            if (questionStates[qId].type === 'multi-mcq' && draftData.qStates[qId].subStates) {
                                if (questionStates[qId].subStates.length === draftData.qStates[qId].subStates.length) {
                                    questionStates[qId].subStates = draftData.qStates[qId].subStates;
                                }
                            }
                        }
                    });

                    Object.keys(questionStates).forEach(qId => {
                        if (qId === 'q21') return;
                        updateQuestionUI(qId);
                    });

                    if (document.getElementById('q21_btn') && typeof updateChemUI === 'function') updateChemUI('q21');
                }
                updateGroupButtons();
            }
        } catch (e) {
            console.error("載入暫存檔發生錯誤，已為您略過損壞的資料:", e);
            localStorage.removeItem('exam_draft');
        }
    }
}

function updateGroupButtons() {
    try {
        const headers = document.querySelectorAll('.question-group-header');
        headers.forEach(header => {
            const btn = header.querySelector('button[onclick^="requestGroupCheck"]');
            if (btn) {
                const match = btn.getAttribute('onclick').match(/'([^']+)'/);
                if (match && match[1]) {
                    const qIds = match[1].split(',');
                    let allDone = true;
                    qIds.forEach(id => {
                        const state = questionStates[id];
                        if (state && !state.isCorrect && state.maxPoints > 0) {
                            allDone = false;
                        }
                    });
                    btn.style.display = allDone ? 'none' : 'inline-block';
                }
            }
        });
    } catch (e) {
        console.error("Group buttons update failed:", e);
    }
}

function updateQuestionUI(qId) {
    try {
        const qState = questionStates[qId];
        const btn = document.getElementById(qId + '_btn');
        const denom = document.getElementById(qId + '_denominator');

        if (!qState || !btn) return;

        let inputs = [];
        if (qState.type === 'mcq') {
            inputs = Array.from(document.querySelectorAll(`input[name="${qId}"]`));
        } else if (qState.type === 'fill-in') {
            const el = document.getElementById(qId);
            if (el) inputs.push(el);
        } else if (qState.type === 'mixed') {
            const textEl = document.getElementById(`${qId}_text`);
            if (textEl) inputs.push(textEl);
            inputs.push(...document.querySelectorAll(`input[name="${qId}_radio"]`));
        }

        if (qState.type === 'multi-mcq') {
            if (!qState.subStates) return;
            qState.subStates.forEach((sub, idx) => {
                const groupInputs = Array.from(document.querySelectorAll(`input[name="${qId}_${idx + 1}"]`));

                groupInputs.forEach(input => {
                    if (!input) return;
                    if (sub.checkedHistory && sub.checkedHistory.includes(input.value)) {
                        input.disabled = true;
                        if (input.parentElement) {
                            input.parentElement.style.color = 'var(--on-surface-de-emphasis)';
                            input.parentElement.style.textDecoration = 'line-through';
                            input.parentElement.style.opacity = '0.6';
                        }
                    }
                });

                if (sub.isCorrect) {
                    const correctInput = document.querySelector(`input[name="${qId}_${idx + 1}"][value="${qState.correctAnswer[idx]}"]`);
                    if (correctInput) {
                        correctInput.checked = true;
                        if (correctInput.parentElement) {
                            correctInput.parentElement.style.color = 'var(--positive)';
                            correctInput.parentElement.style.fontWeight = 'bold';
                            correctInput.parentElement.style.textDecoration = 'none';
                            correctInput.parentElement.style.opacity = '1';
                        }
                    }
                    groupInputs.forEach(input => input && (input.disabled = true));
                } else if (qState.maxPoints === 0) {
                    const correctInput = document.querySelector(`input[name="${qId}_${idx + 1}"][value="${qState.correctAnswer[idx]}"]`);
                    if (correctInput) {
                        correctInput.checked = true;
                        if (correctInput.parentElement) {
                            correctInput.parentElement.style.color = 'var(--danger-color)';
                            correctInput.parentElement.style.fontWeight = 'bold';
                        }
                    }
                    groupInputs.forEach(input => input && (input.disabled = true));
                } else {
                    groupInputs.forEach(input => {
                        if (!input) return;
                        if (!sub.checkedHistory || !sub.checkedHistory.includes(input.value)) {
                            input.disabled = false;
                            if (input.parentElement) {
                                input.parentElement.style.color = 'inherit';
                                input.parentElement.style.fontWeight = 'normal';
                                input.parentElement.style.textDecoration = 'none';
                                input.parentElement.style.opacity = '1';
                            }
                        }
                    });
                }
            });

            if (qState.isCorrect) {
                btn.innerText = qState.maxPoints;
                btn.classList.add('correct');
                btn.classList.remove('wrong');
                btn.disabled = true;
            } else if (qState.maxPoints === 0) {
                btn.innerText = '0';
                btn.classList.add('wrong');
                btn.classList.remove('correct');
                btn.disabled = true;
            } else {
                btn.innerText = '?';
                btn.classList.remove('correct', 'wrong');
                btn.disabled = false;
            }
            if (denom) denom.innerText = `/ ${qState.maxPoints}`;
            updateGroupButtons();
            return;
        }

        if (qState.isCorrect) {
            btn.innerText = qState.maxPoints;
            btn.classList.add('correct');
            btn.classList.remove('wrong');
            btn.disabled = true;
            if (denom) denom.innerText = `/ ${qState.maxPoints}`;
            inputs.forEach(input => input && (input.disabled = true));

        } else if (qState.maxPoints === 0) {
            btn.innerText = '0';
            btn.classList.add('wrong');
            btn.classList.remove('correct');
            btn.disabled = true;
            if (denom) denom.innerText = `/ 0`;
            inputs.forEach(input => input && (input.disabled = true));

            if (qState.type === 'mcq') {
                inputs.forEach(input => {
                    if (input && input.value === qState.correctAnswer) {
                        input.checked = true;
                        if (input.parentElement) {
                            input.parentElement.style.color = 'var(--danger-color)';
                            input.parentElement.style.fontWeight = 'bold';
                        }
                    }
                });
            } else if (qState.type === 'fill-in') {
                if (inputs[0]) {
                    inputs[0].value = qState.correctAnswer;
                    inputs[0].style.color = 'var(--danger-color)';
                    inputs[0].style.fontWeight = 'bold';
                }
            } else if (qState.type === 'mixed') {
                const textEl = document.getElementById(`${qId}_text`);
                if (textEl) {
                    textEl.value = qState.correctAnswer.text;
                    textEl.style.color = 'var(--danger-color)';
                    textEl.style.fontWeight = 'bold';
                }
                document.querySelectorAll(`input[name="${qId}_radio"]`).forEach(radio => {
                    if (radio && radio.value === qState.correctAnswer.radio) {
                        radio.checked = true;
                        if (radio.parentElement) {
                            radio.parentElement.style.color = 'var(--danger-color)';
                            radio.parentElement.style.fontWeight = 'bold';
                        }
                    }
                });
            }

        } else {
            btn.innerText = '?';
            btn.classList.remove('correct', 'wrong');
            btn.disabled = false;
            if (denom) denom.innerText = `/ ${qState.maxPoints}`;

            inputs.forEach(input => {
                if (!input) return;
                input.disabled = false;
                if (input.type === 'radio' || input.type === 'checkbox') {
                    if (input.parentElement) {
                        input.parentElement.style.color = 'inherit';
                        input.parentElement.style.fontWeight = 'normal';
                    }
                } else {
                    input.style.color = 'inherit';
                    input.style.fontWeight = 'normal';
                }
            });
        }
        updateGroupButtons();
    } catch (e) {
        console.error(`UI Update failed for ${qId}:`, e);
    }
}

function requestCheck(qId) {
    try {
        const qState = questionStates[qId];
        if (!qState || qState.isCorrect || qState.maxPoints === 0) return;

        let hasAnswer = false;
        if (qState.type === 'mcq') {
            hasAnswer = !!document.querySelector(`input[name="${qId}"]:checked`);
        } else if (qState.type === 'fill-in') {
            const el = document.getElementById(qId);
            hasAnswer = !!(el && String(el.value || "").trim() !== "");
        } else if (qState.type === 'mixed') {
            const radioEl = document.querySelector(`input[name="${qId}_radio"]:checked`);
            const textEl = document.getElementById(`${qId}_text`);
            const hasText = !!(textEl && String(textEl.value || "").trim() !== "");
            hasAnswer = !!radioEl && hasText;
        } else if (qState.type === 'multi-mcq') {
            hasAnswer = true;
            for (let i = 0; i < qState.correctAnswer.length; i++) {
                if (!qState.subStates[i].isCorrect && !document.querySelector(`input[name="${qId}_${i + 1}"]:checked`)) {
                    hasAnswer = false; break;
                }
            }
        } else if (qState.type === 'chem') {
            hasAnswer = true;
        }
        if (!hasAnswer) {
            showAlert("系統提示", "請先完成作答內容（包含所有選項或空格）再進行檢驗。");
            return;
        }

        if (skipConfirm || qState.attempts > 0) {
            if (qState.type === 'chem') {
                if (typeof executeChemCheck === 'function') executeChemCheck(qId);
            } else {
                executeCheck(qId);
            }
        } else {
            currentCheckQid = qId;
            const cb = document.getElementById('skip_confirm_cb');
            if (cb) cb.checked = false;

            showConfirmModal();
        }
    } catch (e) {
        console.error(`Check request failed for ${qId}:`, e);
    }
}


function requestGroupCheck(qIdsStr) {
    try {
        const qIds = qIdsStr.split(',');

        const pendingQs = qIds.filter(qId => {
            const s = questionStates[qId];
            return s && !s.isCorrect && s.maxPoints > 0;
        });

        if (pendingQs.length === 0) {
            showAlert("系統提示", "本題組所有可作答之題目皆已完成結算（完全正確或已無分數），無需重複檢驗。");
            return;
        }

        let allAnswered = true;
        let missingQs = [];

        pendingQs.forEach(qId => {
            const qState = questionStates[qId];
            if (!qState) return;
            let hasAnswer = false;

            if (qState.type === 'mcq') {
                hasAnswer = !!document.querySelector(`input[name="${qId}"]:checked`);
            } else if (qState.type === 'fill-in') {
                const el = document.getElementById(qId);
                hasAnswer = !!(el && String(el.value || "").trim() !== "");
            } else if (qState.type === 'mixed') {
                const radioEl = document.querySelector(`input[name="${qId}_radio"]:checked`);
                const textEl = document.getElementById(`${qId}_text`);
                const hasText = !!(textEl && String(textEl.value || "").trim() !== "");
                hasAnswer = !!radioEl && hasText;
            } else if (qState.type === 'multi-mcq') {
                hasAnswer = true;
                for (let i = 0; i < qState.correctAnswer.length; i++) {
                    if (!qState.subStates[i].isCorrect && !document.querySelector(`input[name="${qId}_${i + 1}"]:checked`)) {
                        hasAnswer = false; break;
                    }
                }
            } else if (qState.type === 'chem') {
                const react = document.getElementById('reactants_zone')?.querySelectorAll('.chem-term');
                const prod = document.getElementById('products_zone')?.querySelectorAll('.chem-term');
                hasAnswer = (react && react.length > 0) || (prod && prod.length > 0);
            }

            if (!hasAnswer) {
                allAnswered = false;
                missingQs.push(formatQid(qId));
            }
        });

        if (!allAnswered) {
            showAlert("系統提示", `請先完成所有題目的作答內容再進行檢驗。\n（尚未作答題號：${missingQs.join(', ')}）`);
            return;
        }

        if (skipConfirm) {
            executeGroupCheck(pendingQs);
        } else {
            currentCheckGroup = pendingQs;
            const cb = document.getElementById('skip_confirm_cb');
            if (cb) cb.checked = false;

            showConfirmModal();
        }
    } catch (e) {
        console.error("Group check request failed:", e);
    }
}

function executeGroupCheck(qIds) {
    try {
        let results = [];

        qIds.forEach(qId => {
            const qState = questionStates[qId];
            if (!qState) return;
            let displayNum = formatQid(qId);

            if (qId === 'q21') {
                qState.attempts++;
                let isAllCorrect = false;
                if (typeof visualizeChemValidation === 'function') {
                    isAllCorrect = visualizeChemValidation(qId);
                }
                if (isAllCorrect) {
                    qState.isCorrect = true;
                    results.push(`第 ${displayNum} 題：正確 (+${qState.maxPoints} 分)`);
                } else {
                    qState.maxPoints = Math.max(0, qState.maxPoints - 1);
                    results.push(`第 ${displayNum} 題：錯誤 (剩餘 ${qState.maxPoints} 分)`);
                }
                if (typeof updateChemUI === 'function') updateChemUI(qId);
            } else {
                let isCorrect = false;

                if (qState.type === 'mcq') {
                    const el = document.querySelector(`input[name="${qId}"]:checked`);
                    isCorrect = el && el.value === qState.correctAnswer;
                } else if (qState.type === 'fill-in') {
                    const el = document.getElementById(qId);
                    const userAnswer = el ? String(el.value || "").trim() : "";
                    isCorrect = checkAnswerEquivalence(userAnswer, qState.correctAnswer);
                } else if (qState.type === 'mixed') {
                    const el = document.querySelector(`input[name="${qId}_radio"]:checked`);
                    const radioCorrect = el && el.value === qState.correctAnswer.radio;
                    const textEl = document.getElementById(`${qId}_text`);
                    const textAns = textEl ? String(textEl.value || "").trim() : "";
                    const textCorrect = checkAnswerEquivalence(textAns, qState.correctAnswer.text);
                    isCorrect = radioCorrect && textCorrect;
                } else if (qState.type === 'multi-mcq') {
                    let allSubCorrect = true;
                    for (let i = 0; i < qState.correctAnswer.length; i++) {
                        const sub = qState.subStates[i];
                        if (sub.isCorrect) continue;
                        const el = document.querySelector(`input[name="${qId}_${i + 1}"]:checked`);
                        if (el && el.value === qState.correctAnswer[i]) {
                            sub.isCorrect = true;
                        } else {
                            allSubCorrect = false;
                            if (el && !sub.checkedHistory.includes(el.value)) sub.checkedHistory.push(el.value);
                        }
                    }
                    isCorrect = allSubCorrect;
                }

                qState.attempts++;

                if (isCorrect) {
                    qState.isCorrect = true;
                    results.push(`第 ${displayNum} 題：正確 (+${qState.maxPoints} 分)`);
                } else {
                    if (qState.type === 'mcq') {
                        const mcqScores = [5, 2, 1, 0];
                        qState.maxPoints = mcqScores[Math.min(qState.attempts, 3)];
                    } else if (qState.type === 'multi-mcq') {
                        qState.maxPoints = Math.max(0, qState.maxPoints - 1);
                    } else {
                        qState.maxPoints = Math.max(0, qState.maxPoints - 1);
                    }
                    results.push(`第 ${displayNum} 題：錯誤 (剩餘 ${qState.maxPoints} 分)`);
                }
                updateQuestionUI(qId);
            }
        });

        saveDraft();
        showAlert("一鍵檢驗結果報告", results.join('\n'));
    } catch (e) {
        console.error("Group check execution failed:", e);
    }
}

function executeCheck(qId) {
    try {
        const qState = questionStates[qId];
        if (!qState) return;

        let isCorrect = false;

        if (qState.type === 'mcq') {
            const el = document.querySelector(`input[name="${qId}"]:checked`);
            isCorrect = el && el.value === qState.correctAnswer;
        } else if (qState.type === 'fill-in') {
            const el = document.getElementById(qId);
            const userAnswer = el ? String(el.value || "").trim() : "";
            isCorrect = checkAnswerEquivalence(userAnswer, qState.correctAnswer);
        } else if (qState.type === 'mixed') {
            const el = document.querySelector(`input[name="${qId}_radio"]:checked`);
            const radioCorrect = el && el.value === qState.correctAnswer.radio;
            const textEl = document.getElementById(`${qId}_text`);
            const textAns = textEl ? String(textEl.value || "").trim() : "";
            const textCorrect = checkAnswerEquivalence(textAns, qState.correctAnswer.text);
            isCorrect = radioCorrect && textCorrect;
        } else if (qState.type === 'multi-mcq') {
            let allSubCorrect = true;
            for (let i = 0; i < qState.correctAnswer.length; i++) {
                const sub = qState.subStates[i];
                if (sub.isCorrect) continue;
                const el = document.querySelector(`input[name="${qId}_${i + 1}"]:checked`);
                if (el && el.value === qState.correctAnswer[i]) {
                    sub.isCorrect = true;
                } else {
                    allSubCorrect = false;
                    if (el && !sub.checkedHistory.includes(el.value)) {
                        sub.checkedHistory.push(el.value);
                    }
                }
            }
            isCorrect = allSubCorrect;
        }

        qState.attempts++;

        if (isCorrect) {
            qState.isCorrect = true;
            updateQuestionUI(qId);
            showAlert("檢驗結果：正確", `驗證通過。本題獲得 ${qState.maxPoints} 分。`);
        } else {
            if (qState.type === 'mcq') {
                const mcqScores = [5, 2, 1, 0];
                qState.maxPoints = mcqScores[Math.min(qState.attempts, 3)];
            } else if (qState.type === 'multi-mcq') {
                qState.maxPoints = Math.max(0, qState.maxPoints - 1);
            } else {
                qState.maxPoints = Math.max(0, qState.maxPoints - 1);
            }

            updateQuestionUI(qId);

            if (qState.maxPoints === 0) {
                showAlert("檢驗結果：失敗", `本題分數已扣至 0 分。\n系統已鎖定欄位並公布正確答案。`);
            } else {
                showAlert("檢驗結果：錯誤", `答案不正確，請重新作答。\n本題當前最高可得 ${qState.maxPoints} 分。`);
            }
        }
        saveDraft();
    } catch (e) {
        console.error(`Check execution failed for ${qId}:`, e);
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm_modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    currentCheckQid = null;
    currentCheckGroup = null;
}

function showConfirmModal() {
    let modal = document.getElementById('confirm_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm_modal';
        modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;";
        modal.innerHTML = `
            <div style="background: var(--surface, #fff); padding: 20px; border-radius: 8px; max-width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0; color: var(--warning, #f9ab00);">確認檢驗答案</h3>
                <p style="color: var(--on-surface-default, #333);">即將進行答案檢驗。送出後將會扣除嘗試次數，確定要繼續嗎？</p>
                <div style="margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 5px;">
                    <input type="checkbox" id="skip_confirm_cb">
                    <label for="skip_confirm_cb" style="font-size: 0.9rem; color: var(--on-surface-de-emphasis, #666);">不要再顯示此確認視窗</label>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
                    <button type="button" onclick="closeConfirmModal()" style="padding: 8px 16px; background: transparent; border: 1px solid var(--outline, #ccc); border-radius: 4px; cursor: pointer; color: var(--on-surface-default, #333);">取消</button>
                    <button type="button" onclick="confirmCheck()" style="padding: 8px 16px; background: var(--primary, #0b57d0); color: #fff; border: none; border-radius: 4px; cursor: pointer;">確定送出</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function confirmCheck() {
    const cb = document.getElementById('skip_confirm_cb');
    if (cb && cb.checked) {
        skipConfirm = true;
    }

    const targetGroup = currentCheckGroup;
    const targetQid = currentCheckQid;

    closeConfirmModal();

    if (targetGroup) {
        executeGroupCheck(targetGroup);
    } else if (targetQid) {
        if (targetQid === 'q21' || targetQid.startsWith('q6')) {
            if (typeof executeChemCheck === 'function') executeChemCheck(targetQid);
        } else {
            executeCheck(targetQid);
        }
    }
}

function formatQid(qId) {
    let num = qId.replace('q', '');
    if (num === '231') return '23-1';
    if (num === '232') return '23-2';
    if (num === '301') return '30-1';
    if (num === '302') return '30-2';
    return num;
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
// 模組八：系統交卷傳輸
// ==========================================
async function submitExam() {
    const btn = document.getElementById('submit_btn');
    const statusMsg = document.getElementById('status_message');

    const getRadioValue = (name) => {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? el.value : "";
    };

    const payload = {
        student_id: currentStudentId,
        exam_id: "26T",
        total_score: 0,
        answers: {
            q21_reactants: Array.from(document.getElementById('reactants_zone')?.querySelectorAll('.chem-term') || []).map(t => ({
                raw: t.getAttribute('data-raw'), coeff: t.querySelector('.chem-coeff').value
            })),
            q21_products: Array.from(document.getElementById('products_zone')?.querySelectorAll('.chem-term') || []).map(t => ({
                raw: t.getAttribute('data-raw'), coeff: t.querySelector('.chem-coeff').value
            }))
        },
        scores: {}
    };

    let totalScore = 0;

    // 動態寫入所有題目的作答資料與分數
    Object.keys(questionStates).forEach(qId => {
        // 【新增】：取得單題得分 (完全正確才給當下剩餘的 maxPoints，否則 0 分)
        const earnedPoints = questionStates[qId].isCorrect ? questionStates[qId].maxPoints : 0;
        payload.scores[qId] = earnedPoints; // 寫入單題得分
        totalScore += earnedPoints;         // 累加至總分

        if (qId === 'q21') return; // 化學題已單獨處理

        const qState = questionStates[qId];
        if (qState.type === 'mcq') {
            payload.answers[qId] = getRadioValue(qId);
        } else if (qState.type === 'fill-in') {
            payload.answers[qId] = document.getElementById(qId)?.value || "";
        } else if (qState.type === 'mixed') {
            payload.answers[`${qId}_text`] = document.getElementById(`${qId}_text`)?.value || "";
            payload.answers[`${qId}_radio`] = getRadioValue(`${qId}_radio`);
        } else if (qState.type === 'multi-mcq') {
            payload.answers[qId] = [];
            for (let i = 0; i < qState.correctAnswer.length; i++) {
                payload.answers[qId].push(getRadioValue(`${qId}_${i + 1}`) || "");
            }
        }
    });

    // 將累加完成的總分寫回 payload 中
    payload.total_score = totalScore;

    Object.keys(questionStates).forEach(qId => {
        payload.scores[qId] = questionStates[qId].isCorrect ? questionStates[qId].maxPoints : 0;

        if (qId === 'q21') return;

        const qState = questionStates[qId];
        if (qState.type === 'mcq') {
            payload.answers[qId] = getRadioValue(qId);
        } else if (qState.type === 'fill-in') {
            payload.answers[qId] = document.getElementById(qId)?.value || "";
        } else if (qState.type === 'mixed') {
            payload.answers[`${qId}_text`] = document.getElementById(`${qId}_text`)?.value || "";
            payload.answers[`${qId}_radio`] = getRadioValue(`${qId}_radio`);
        } else if (qState.type === 'multi-mcq') {
            payload.answers[qId] = [];
            for (let i = 0; i < qState.correctAnswer.length; i++) {
                payload.answers[qId].push(getRadioValue(`${qId}_${i + 1}`) || "");
            }
        }
    });

    try {
        // 【新增】：標記該學號已交卷，並清除暫存草稿
        localStorage.setItem('exam_submitted_' + currentStudentId, 'true');
        localStorage.removeItem('exam_draft');

        // 【新增】：將畫面替換為交卷成功提示，防止繼續操作考卷
        const examSection = document.getElementById('exam_section');
        if (examSection) {
            examSection.innerHTML = '<div style="text-align:center; padding: 100px 20px;"><h2 style="color: var(--primary-color);">✅ 測驗已結束，交卷成功！</h2><p style="color: var(--on-surface-de-emphasis); margin-top: 15px; font-size: 1.1rem;">您的成績與作答紀錄已安全送出，請關閉此網頁。</p></div>';
        }

        if (btn) {
            btn.disabled = true;
            btn.innerText = "傳送中...";
        }
        if (statusMsg) {
            statusMsg.innerText = "正在將您的答案傳送至伺服器...";
            statusMsg.style.color = "var(--primary-color)";
        }

        // Mock API Request (Replace with real fetch)
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (statusMsg) {
            statusMsg.innerText = "交卷成功！感謝您的作答。";
            statusMsg.style.color = "var(--positive)";
        }
        if (btn) {
            btn.innerText = "已交卷";
        }
        showAlert("系統提示", "交卷成功！您的作答已經被記錄。");
        localStorage.removeItem('exam_draft');
    } catch (e) {
        console.error("Submit failed:", e);
        if (btn) {
            btn.disabled = false;
            btn.innerText = "確認交卷";
        }
        if (statusMsg) {
            statusMsg.innerText = "❌ 交卷失敗，請檢查網路連線後再試一次。";
            statusMsg.style.color = "var(--danger-color)";
        }
        showAlert("錯誤", "傳送失敗，請稍後重試。如果持續失敗，請聯絡助教。");
    }
}




// ==========================================
// 模組九：第 21 題 專屬化學反應式邏輯 (完美對接 HTML 與拖曳功能)
// ==========================================
function addChemFormula() {
    console.log("【系統】按鈕觸發：開始尋找化學式輸入框");

    // 【修正】：完美對接您 HTML 的 id="chem_input"
    let input = document.getElementById('chem_input') || document.getElementById('custom_chem_input');

    if (!input) {
        showAlert("HTML 標籤缺失", "找不到輸入框！\n請確認您的 HTML 程式碼中，該輸入框是否有加上 id=\"chem_input\"");
        console.error("找不到 ID 為 chem_input 的輸入框");
        return;
    }

    const val = input.value.trim();
    if (!val) {
        showAlert("系統提示", "請輸入化學式！(例如：Na2CO3)");
        return;
    }

    let pool = document.getElementById('chem_pool');
    if (!pool) {
        showAlert("HTML 標籤缺失", "找不到素材區！\n請確認您的 HTML 程式碼中，素材區是否有加上 id=\"chem_pool\"");
        return;
    }

    console.log("【系統】成功擷取化學式：", val);
    createChemChip(val, pool.id);
    input.value = '';
    saveDraft();
}

function addCustomChem() {
    addChemFormula(); // 備用名稱相容
}

function parseChemStr(str) {
    return str
        .replace(/\^([0-9]*[+-])/g, '<sup>$1</sup>') // 步驟一：先將 ^ 後面的電荷轉為上標
        .replace(/([A-Za-z\)])([0-9]+)/g, '$1<sub>$2</sub>'); // 步驟二：將字母或 ) 後面的數字無條件轉為下標
}

// --- 拖曳與點擊共用的核心移動邏輯 ---
function moveChipToZone(chipId, nextZoneId) {
    if (questionStates.q21 && questionStates.q21.isCorrect) return;
    if (questionStates.q21 && questionStates.q21.maxPoints === 0) return;

    const chip = document.getElementById(chipId);
    if (!chip) return;

    const nextZone = document.getElementById(nextZoneId);
    if (!nextZone) {
        console.error("找不到目標區域 ID:", nextZoneId);
        return;
    }

    const rawStr = chip.getAttribute('data-raw');
    const coeff = chip.querySelector('.chem-coeff') ? chip.querySelector('.chem-coeff').value : 1;

    chip.remove(); // 移除舊標籤

    // 重建新標籤 (為了觸發動畫與事件綁定)
    const newChip = document.createElement('div');
    newChip.className = 'chem-term';
    newChip.id = chipId;
    newChip.setAttribute('data-raw', rawStr);
    newChip.setAttribute('draggable', 'true'); // 賦予可拖曳屬性
    newChip.ondragstart = function (e) { e.dataTransfer.setData("text", e.target.id); };

    const displayHtml = parseChemStr(rawStr);

    if (nextZoneId === 'chem_pool') {
        newChip.innerHTML = `<span>${displayHtml}</span>`;
    } else {
        newChip.innerHTML = `<input type="number" class="chem-coeff" value="${coeff}" min="1" onchange="saveDraft()"> <span>${displayHtml}</span>`;
    }

    // 保留點擊移動的功能，方便手機使用者操作
    newChip.onclick = function (e) {
        if (e.target.tagName.toLowerCase() === 'input') return;
        let cZone = newChip.parentElement.id;
        let nZone = cZone === 'chem_pool' ? 'reactants_zone' : (cZone === 'reactants_zone' ? 'products_zone' : 'chem_pool');
        moveChipToZone(newChip.id, nZone);
    };

    checkPlaceholders();
    nextZone.appendChild(newChip);
    if (nextZone.querySelector('.chem-pool-placeholder')) nextZone.querySelector('.chem-pool-placeholder').style.display = 'none';

    saveDraft();
}

function createChemChip(rawStr, targetZoneId) {
    const chipId = 'chem_' + Math.random().toString(36).substr(2, 9);
    // 建立臨時假標籤丟給 moveChipToZone 處理
    const tempDiv = document.createElement('div');
    tempDiv.id = chipId;
    tempDiv.setAttribute('data-raw', rawStr);
    document.body.appendChild(tempDiv);
    moveChipToZone(chipId, targetZoneId);
}

function restoreChemChip(data, targetZoneId) {
    const chipId = data.id;
    const tempDiv = document.createElement('div');
    tempDiv.id = chipId;
    tempDiv.setAttribute('data-raw', data.raw);
    tempDiv.innerHTML = `<input class="chem-coeff" value="${data.coeff}">`;
    document.body.appendChild(tempDiv);
    moveChipToZone(chipId, targetZoneId);
}

function checkPlaceholders() {
    const placeholders = document.querySelectorAll('.chem-pool-placeholder');
    placeholders.forEach(p => {
        if (p.parentElement.querySelectorAll('.chem-term').length === 0) {
            p.style.display = 'block';
        } else {
            p.style.display = 'none';
        }
    });
}

// --- 完美對接您 HTML 的 Drag and Drop (拖曳) 功能 ---
function allowDrop(ev) {
    ev.preventDefault();
}

function dropToPool(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    moveChipToZone(data, 'chem_pool');
}

function dropToZone(ev, zoneType) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    moveChipToZone(data, zoneType === 'reactants' ? 'reactants_zone' : 'products_zone');
}

function dropToTrash(ev) {
    ev.preventDefault();

    if (questionStates.q21 && (questionStates.q21.isCorrect || questionStates.q21.maxPoints === 0)) {
        return;
    }

    const data = ev.dataTransfer.getData("text");
    const chip = document.getElementById(data);
    if (chip) {
        chip.remove();
        checkPlaceholders();
        saveDraft();
    }
}

// --- 化學式檢驗與 UI 邏輯 ---
function visualizeChemValidation(qId) {
    const qState = questionStates[qId];
    if (!qState || qState.type !== 'chem') return false;

    const rZone = document.getElementById('reactants_zone');
    const pZone = document.getElementById('products_zone');
    if (!rZone || !pZone) return false;

    const getTerms = (zone) => {
        const terms = {};
        zone.querySelectorAll('.chem-term').forEach(chip => {
            const raw = chip.getAttribute('data-raw');
            const coeff = parseInt(chip.querySelector('.chem-coeff').value, 10) || 1;
            terms[raw] = (terms[raw] || 0) + coeff;
        });
        return terms;
    };

    const userReactants = getTerms(rZone);
    const userProducts = getTerms(pZone);
    const correctR = qState.correctAnswer.reactants;
    const correctP = qState.correctAnswer.products;

    const checkMatch = (user, correct, zone) => {
        let allMatch = true;
        const terms = zone.querySelectorAll('.chem-term');
        terms.forEach(chip => {
            const raw = chip.getAttribute('data-raw');
            const coeff = parseInt(chip.querySelector('.chem-coeff').value, 10) || 1;

            if (correct[raw] !== undefined) {
                if (correct[raw] === coeff) {
                    chip.style.borderColor = 'var(--positive)';
                    chip.style.backgroundColor = '#e8f5e9';
                } else {
                    chip.style.borderColor = 'var(--warning)';
                    chip.style.backgroundColor = '#fff8e1';
                    allMatch = false;
                }
            } else {
                chip.style.borderColor = 'var(--danger-color)';
                chip.style.backgroundColor = '#ffebee';
                allMatch = false;
            }
        });

        Object.keys(correct).forEach(k => {
            if (!user[k]) allMatch = false;
        });
        return allMatch;
    };

    const rMatch = checkMatch(userReactants, correctR, rZone);
    const pMatch = checkMatch(userProducts, correctP, pZone);

    return rMatch && pMatch;
}

window.updateChemUI = function (qId) {
    const qState = questionStates[qId];
    const btn = document.getElementById(qId + '_btn');
    const denom = document.getElementById(qId + '_denominator');
    if (!btn || !qState) return;

    const inputs = document.querySelectorAll('#reactants_zone .chem-coeff, #products_zone .chem-coeff');
    const trash = document.getElementById('chem_trash');
    const rZone = document.getElementById('reactants_zone');
    const pZone = document.getElementById('products_zone');
    const customInput = document.getElementById('chem_input') || document.getElementById('custom_chem_input');
    const customBtn = document.querySelector('.chem-input-area button');

    if (qState.isCorrect) {
        btn.innerText = qState.maxPoints;
        btn.classList.add('correct');
        btn.classList.remove('wrong');
        btn.disabled = true;
        if (denom) denom.innerText = `/ ${qState.maxPoints}`;
        inputs.forEach(input => input.disabled = true);

        if (trash) {
            trash.style.opacity = '0.5';
            trash.style.pointerEvents = 'none';
        }
        if (rZone) rZone.style.pointerEvents = 'none';
        if (pZone) pZone.style.pointerEvents = 'none';
        if (customInput) customInput.disabled = true;
        if (customBtn) customBtn.disabled = true;

    } else if (qState.maxPoints === 0) {
        btn.innerText = '0';
        btn.classList.add('wrong');
        btn.classList.remove('correct');
        btn.disabled = true;
        if (denom) denom.innerText = `/ 0`;
        inputs.forEach(input => input.disabled = true);

        if (trash) {
            trash.style.opacity = '0.5';
            trash.style.pointerEvents = 'none';
        }
        if (rZone) rZone.style.pointerEvents = 'none';
        if (pZone) pZone.style.pointerEvents = 'none';
        if (customInput) customInput.disabled = true;
        if (customBtn) customBtn.disabled = true;

        // 終極防護：手動清空並直接用原生 JS 暴力生成元素，完全不依賴外部函數
        if (rZone) rZone.innerHTML = '';
        if (pZone) pZone.innerHTML = '';

        // 內建字串處理，防止找不到 parseChemStr
        const fallbackParse = (str) => {
            if (typeof parseChemStr === 'function') return parseChemStr(str);
            let s = str.replace(/\^([0-9]+[+-]|[+-])/g, '<sup>$1</sup>');
            return s.replace(/([A-Za-z\)])([0-9]+)/g, '$1<sub>$2</sub>');
        };

        // 直接手工打造解答標籤
        const buildCorrectChip = (obj, zone) => {
            if (!obj || !zone) return;
            Object.keys(obj).forEach(k => {
                const coeff = obj[k];
                const chip = document.createElement('div');
                chip.className = 'chem-term';
                chip.style.display = 'inline-flex';
                chip.style.alignItems = 'center';
                chip.style.padding = '6px 12px';
                chip.style.margin = '5px';
                chip.style.borderRadius = '8px';
                chip.style.backgroundColor = '#fff0f0';
                chip.style.border = '2px solid var(--danger-color)';

                const inp = document.createElement('input');
                inp.type = 'number';
                inp.className = 'chem-coeff';
                inp.value = coeff;
                inp.disabled = true;
                inp.style.width = '45px';
                inp.style.marginRight = '8px';
                inp.style.textAlign = 'center';
                inp.style.fontWeight = 'bold';
                inp.style.color = 'var(--danger-color)';
                inp.style.backgroundColor = 'transparent';
                inp.style.border = '1px solid #ccc';
                inp.style.borderRadius = '4px';

                const span = document.createElement('span');
                span.className = 'chem-formula';
                span.innerHTML = fallbackParse(k);
                span.style.fontWeight = 'bold';
                span.style.color = '#333';
                span.style.fontSize = '1.1em';

                chip.appendChild(inp);
                chip.appendChild(span);
                zone.appendChild(chip);
            });
        };

        if (qState.correctAnswer) {
            buildCorrectChip(qState.correctAnswer.reactants, rZone);
            buildCorrectChip(qState.correctAnswer.products, pZone);
        }

        try {
            if (typeof checkPlaceholders === 'function') checkPlaceholders();
        } catch (e) { }

    } else {
        btn.innerText = '?';
        btn.classList.remove('correct', 'wrong');
        btn.disabled = false;
        if (denom) denom.innerText = `/ ${qState.maxPoints}`;
        inputs.forEach(input => input.disabled = false);

        if (trash) {
            trash.style.opacity = '1';
            trash.style.pointerEvents = 'auto';
        }
        if (rZone) rZone.style.pointerEvents = 'auto';
        if (pZone) pZone.style.pointerEvents = 'auto';
        if (customInput) customInput.disabled = false;
        if (customBtn) customBtn.disabled = false;
    }
    if (typeof updateGroupButtons === 'function') updateGroupButtons();
};


function executeChemCheck(qId) {
    const qState = questionStates[qId];
    if (!qState) return;

    qState.attempts++;
    const isAllCorrect = visualizeChemValidation(qId);

    if (isAllCorrect) {
        qState.isCorrect = true;
        updateChemUI(qId);
        showAlert("檢驗結果：正確", `化學反應式已平衡！本題獲得 ${qState.maxPoints} 分。`);
    } else {
        qState.maxPoints = Math.max(0, qState.maxPoints - 1);
        updateChemUI(qId);

        if (qState.maxPoints === 0) {
            showAlert("檢驗結果：失敗", `本題分數已扣至 0 分。\n系統已鎖定欄位並公布正確答案。`);
        } else {
            showAlert("檢驗結果：錯誤", `反應式不平衡或有誤。\n正確的物質會標示綠框，係數錯誤標示黃框，放錯區域或多餘的物質標示紅框。\n本題當前最高可得 ${qState.maxPoints} 分。`);
        }
    }
    saveDraft();
}

// ==========================================
// 模組十：全域綁定保護機制
// 確保 HTML onclick 與 ondrop 呼叫的函數都能在全域被找到
// ==========================================
window.verifyLogin = verifyLogin;
window.requestCheck = requestCheck;
window.requestGroupCheck = requestGroupCheck;
window.confirmCheck = confirmCheck;
window.closeConfirmModal = closeConfirmModal;
window.closeAlertModal = closeAlertModal;
window.submitExam = submitExam;
window.addChemFormula = addChemFormula;
window.addCustomChem = addCustomChem;
window.executeChemCheck = executeChemCheck;
window.restoreChemChip = restoreChemChip;

window.allowDrop = allowDrop;
window.dropToPool = dropToPool;
window.dropToZone = dropToZone;
window.dropToTrash = dropToTrash;