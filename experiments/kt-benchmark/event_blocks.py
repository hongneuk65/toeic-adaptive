"""Contiguous submit iterator, equivalent to pandas groupby on sorted inputs."""
from itertools import groupby

def event_blocks(frame):
    seen = set()
    for key, rows in groupby(frame.itertuples(), key=lambda row: (row.user_id, row.timestamp)):
        if key in seen:
            raise ValueError('Submit rows must be contiguous')
        seen.add(key)
        yield key, list(rows)
