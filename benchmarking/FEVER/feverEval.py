import pandas as pd

def get_fever_sample(count, filename='./train.jsonl', randomState=42):
    df = pd.read_json(filename, lines=True)
    return df.sample(n=count, random_state=randomState)
