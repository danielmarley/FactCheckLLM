import pandas as pd

def get_fever_sample(count, filename='./data_train.json', randomState=42):
    df = pd.read_json(filename)
    df["claim"] = df.apply(
        lambda row: f"{row['speaker']}: {row['claim']}" if pd.notnull(row["speaker"]) else row["claim"],
        axis=1
    )
    return df.sample(n=count, random_state=randomState)
