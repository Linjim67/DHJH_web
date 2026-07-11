from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any
from datetime import datetime, timezone


from pydantic import BaseModel, Field
from typing import Dict, Any
from datetime import datetime

class AnswerSubmission(BaseModel):
    # 學生學號，採用正規表達式確保格式正確 (例如 b 開頭加 8 位數字)
    student_id: str = Field(..., pattern=r"^[a-zA-Z]\d{8}$")
    exam_id: str
    # 答案格式設計為字典，鍵為題號，值為學生的作答內容
    answers: Dict[str, Any] 
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": "b12901001",
                "exam_id": "midterm_01",
                "answers": {
                    "q1": "A",
                    "q2": "C",
                    "q3": "澱粉老化 (Retrogradation) 的機制為..."
                }
            }
        }


app = FastAPI(title="考試提交系統 API")

# 資料庫連線全域變數
db_client = None
db = None

@app.on_event("startup")
async def startup_db_client():
    global db_client, db
    # 透過環境變數安全地讀取 MongoDB Atlas 連線字串
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_client = AsyncIOMotorClient(mongo_uri)
    db = db_client["exam_system"]

@app.on_event("shutdown")
async def shutdown_db_client():
    db_client.close()

@app.post("/api/submit", status_code=status.HTTP_201_CREATED)
async def submit_answers(submission: AnswerSubmission):
    try:
        # 1. 系統強制注入伺服器端時間戳記，防範前端偽造時間
        submission_data = submission.model_dump()
        submission_data["submitted_at"] = datetime.now(timezone.utc)
        submission_data["server_status"] = "recorded"

        # 2. 執行資料庫寫入操作 (寫入 submissions 集合)
        collection = db["submissions"]
        
        # 採用 update_one 搭配 upsert=True，允許學生在時限內重複提交並覆蓋舊答案
        # 若需保留所有歷史紀錄，則改用 insert_one
        result = await collection.update_one(
            {"student_id": submission.student_id, "exam_id": submission.exam_id},
            {"$set": submission_data},
            upsert=True
        )

        return {"message": "答案提交成功", "timestamp": submission_data["submitted_at"]}

    except Exception as e:
        raise HTTPException(status_code=500, detail="資料庫寫入失敗")