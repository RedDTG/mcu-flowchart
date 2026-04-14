from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BaseApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class MediaLink(BaseApiModel):
    media_id: str = Field(min_length=1)


class MediaConnections(BaseApiModel):
    required: list[MediaLink] = Field(default_factory=list)
    optionnal: list[MediaLink] = Field(default_factory=list)
    references: list[MediaLink] = Field(default_factory=list)


class Media(BaseApiModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    release_date: date = Field(alias="release date")
    phase: int
    mediatype: Literal["movie", "show", "special"]
    poster: str = Field(min_length=1)  # Can be URL or local path
    summary: str = Field(min_length=1)
    connections: MediaConnections


class MediaNode(BaseApiModel):
    id: str
    title: str
    release_date: date = Field(alias="release date")
    phase: int
    mediatype: Literal["movie", "show", "special"]
    poster: str


class GraphEdge(BaseApiModel):
    source: str
    target: str
    type: str


class GraphResponse(BaseApiModel):
    nodes: list[MediaNode]
    edges: list[GraphEdge]
