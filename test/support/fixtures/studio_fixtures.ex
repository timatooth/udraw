defmodule Udraw.StudioFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Udraw.Studio` context.
  """

  @doc """
  Generate a canvas.
  """
  def canvas_fixture(attrs \\ %{}) do
    {:ok, canvas} =
      attrs
      |> Enum.into(%{
        name: "some name"
      })
      |> Udraw.Studio.create_canvas()

    canvas
  end
end
