from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_serializer, model_validator

UniverseId = Literal[
    "mcu",
    "marvel-television",
    "fox-marvel-cinematic-universe",
    "sonys-spider-man-universe",
    "columbia-pictures",
    "new-line-cinema",
    "netflix",
]


class BaseApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class MediaLink(BaseApiModel):
    media_id: str | None = Field(default=None, min_length=1)
    saga_id: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def validate_target(self) -> "MediaLink":
        if bool(self.media_id) == bool(self.saga_id):
            raise ValueError("connection must define exactly one target: media_id or saga_id")
        return self

    @model_serializer(mode="plain")
    def serialize_link(self) -> dict[str, str]:
        if self.media_id:
            return {"media_id": self.media_id}
        if self.saga_id:
            return {"saga_id": self.saga_id}
        return {}


class MediaConnections(BaseApiModel):
    required: list[MediaLink] = Field(default_factory=list)
    optional: list[MediaLink] = Field(default_factory=list)
    references: list[MediaLink] = Field(default_factory=list)


class Media(BaseApiModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    release_date: date
    end_date: date | None = None
    saga: str | None = None
    phase: int | None = None
    universe: UniverseId
    mediatype: Literal["movie", "show", "special"]
    poster: str = Field(min_length=1)  # Can be URL or local path
    summary: str = Field(min_length=1)
    connections: MediaConnections


class MediaNode(BaseApiModel):
    id: str
    title: str
    release_date: date
    saga: str | None = None
    universe: UniverseId
    mediatype: Literal["movie", "show", "special"]
    poster: str


class Universe(BaseApiModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    short_name: str = Field(min_length=1)
    order: int = Field(ge=1)
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    phases: list[int] | None = None


class Saga(BaseApiModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    short_name: str = Field(min_length=1)
    order: int = Field(ge=1)
    description: str = Field(min_length=1)
    poster: str = Field(min_length=1)


class GraphEdge(BaseApiModel):
    source: str
    target: str
    type: str


class GraphResponse(BaseApiModel):
    nodes: list[MediaNode]
    edges: list[GraphEdge]

