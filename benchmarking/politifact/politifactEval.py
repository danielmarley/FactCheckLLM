import pandas as pd

def get_politifact_sample(count, filename='./politifact_factcheck_data.json', randomState=42):
    df = pd.read_json(filename, lines=True)
    df["statement"] = df.apply(
        lambda row: f"{row['statement_originator']}: {row['statement']}" if pd.notnull(row["statement_originator"]) else row["statement"],
        axis=1
    )
    return df.sample(n=count, random_state=randomState)