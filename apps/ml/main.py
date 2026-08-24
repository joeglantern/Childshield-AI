"""ChildShield ML service — ADVISORY ONLY (safeguarding invariant 2).

Rule/keyword baseline stub so the pipeline ships before the fine-tuned
AfroXLMR model lands (Milestone B3). This service:
  - never receives or touches media content (zero-content invariant),
  - never transitions cases, creates referrals, or sends notifications —
    its output is written by the API as CaseEvent(kind=AI_ASSESSMENT) only,
  - is reachable on the internal Docker network only, behind an API key.
"""

import os
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

API_KEY = os.environ.get("ML_SERVICE_API_KEY", "")

app = FastAPI(title="ChildShield ML (advisory stub)", version="0.1.0")


def require_api_key(x_api_key: Annotated[str | None, Header()] = None) -> None:
    if not API_KEY:
        return  # dev mode without a key configured
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="invalid api key")


class ClassifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    language_hint: str | None = None


class ClassifyResponse(BaseModel):
    labels: list[str]
    scores: dict[str, float]
    model: str = "keyword-baseline-v0"


class SeverityRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    incident_type: str | None = None
    labels: list[str] = []


class SeverityResponse(BaseModel):
    severity: str
    confidence: float
    explanation: list[str]
    model: str = "rule-baseline-v0"


# Keyword baseline — deliberately simple, EN/SW/Sheng starter lists.
LABEL_KEYWORDS: dict[str, list[str]] = {
    "grooming": ["meet me", "our secret", "siri yetu", "don't tell", "usimwambie", "gift", "zawadi"],
    "sextortion": ["photo", "picha", "pay", "lipa", "share it", "expose", "nitasambaza", "screenshot"],
    "bullying": ["bully", "laugh at", "wananicheka", "hate me", "insult", "matusi", "group chat"],
    "self_harm": ["kill myself", "kujiua", "hurt myself", "kujidhuru", "no reason to live", "kufa"],
    "coercion": ["force", "lazimisha", "threaten", "tisho", "must do", "or else", "blackmail"],
    "harmful_exposure": ["explicit", "porn", "video chafu", "adult content", "gambling", "kamari"],
}

CRITICAL_MARKERS = ["kill myself", "kujiua", "kufa", "tonight", "leo usiku", "meet me now", "address"]
HIGH_MARKERS = ["threaten", "tisho", "expose", "nitasambaza", "pay", "lipa", "force", "lazimisha"]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/classify", response_model=ClassifyResponse, dependencies=[Depends(require_api_key)])
def classify(req: ClassifyRequest) -> ClassifyResponse:
    text = req.text.lower()
    scores: dict[str, float] = {}
    for label, keywords in LABEL_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text)
        scores[label] = min(1.0, hits / 3)
    labels = [label for label, score in scores.items() if score >= 0.34]
    if not labels:
        labels = ["benign"]
    return ClassifyResponse(labels=labels, scores=scores)


@app.post("/severity", response_model=SeverityResponse, dependencies=[Depends(require_api_key)])
def severity(req: SeverityRequest) -> SeverityResponse:
    text = req.text.lower()
    explanation: list[str] = []

    critical_hits = [m for m in CRITICAL_MARKERS if m in text]
    high_hits = [m for m in HIGH_MARKERS if m in text]

    if critical_hits or "self_harm" in req.labels:
        tier, confidence = "CRITICAL", 0.55
        explanation += [f"critical marker: '{m}'" for m in critical_hits]
        if "self_harm" in req.labels:
            explanation.append("label: self_harm")
    elif high_hits or {"sextortion", "grooming", "coercion"} & set(req.labels):
        tier, confidence = "HIGH", 0.5
        explanation += [f"high marker: '{m}'" for m in high_hits]
    elif req.labels and req.labels != ["benign"]:
        tier, confidence = "MEDIUM", 0.45
        explanation.append(f"labels present: {', '.join(req.labels)}")
    else:
        tier, confidence = "LOW", 0.4
        explanation.append("no risk markers found by baseline")

    return SeverityResponse(severity=tier, confidence=confidence, explanation=explanation)
