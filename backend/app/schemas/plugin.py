from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PluginEvaluateIn(BaseModel):
    parameters: dict[str, Any] = Field(max_length=100)


class PluginDefinitionOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    manifest: dict
    parameter_schema: dict = Field(alias="schema")
    presets: list[dict]


class PluginEvaluationOut(BaseModel):
    parameters: dict
    messages: list[dict]
    calculations: dict
    geometry: dict
