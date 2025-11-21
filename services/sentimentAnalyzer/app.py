from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from fastapi import FastAPI
from pydantic import BaseModel

tokenizer = AutoTokenizer.from_pretrained("Naphadon/finetuning-restaurant-reviews-distilbert")
model = AutoModelForSequenceClassification.from_pretrained("Naphadon/finetuning-restaurant-reviews-distilbert")
app = FastAPI()

def analyze(text):
    encoded_input = tokenizer(text, return_tensors='pt')
    output = model(**encoded_input)
    pred = torch.softmax(output.logits, dim=-1)
    return (pred.tolist())[0];

class Request(BaseModel):
    text: str

class Response(BaseModel):
    positive: float
    negative: float

@app.post("/api/v1/sentiment", response_model=Response)
def sentiment_analysis(request: Request):
    scores = analyze(request.text)
    print(scores)
    negative,positive = scores
    return Response(positive=positive, negative=negative)
