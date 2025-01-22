defmodule Udraw.Studio do
  @moduledoc """
  The Studio context.
  """

  import Ecto.Query, warn: false
  alias Udraw.Repo

  alias Udraw.Studio.Canvas

  @doc """
  Returns the list of canvases.

  ## Examples

      iex> list_canvases()
      [%Canvas{}, ...]

  """
  def list_canvases do
    Repo.all(Canvas)
  end

  @doc """
  Gets a single canvas.

  Raises `Ecto.NoResultsError` if the Canvas does not exist.

  ## Examples

      iex> get_canvas!(123)
      %Canvas{}

      iex> get_canvas!(456)
      ** (Ecto.NoResultsError)

  """
  def get_canvas!(id), do: Repo.get!(Canvas, id)

  @doc """
  Creates a canvas.

  ## Examples

      iex> create_canvas(%{field: value})
      {:ok, %Canvas{}}

      iex> create_canvas(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_canvas(attrs \\ %{}) do
    %Canvas{}
    |> Canvas.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a canvas.

  ## Examples

      iex> update_canvas(canvas, %{field: new_value})
      {:ok, %Canvas{}}

      iex> update_canvas(canvas, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_canvas(%Canvas{} = canvas, attrs) do
    canvas
    |> Canvas.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a canvas.

  ## Examples

      iex> delete_canvas(canvas)
      {:ok, %Canvas{}}

      iex> delete_canvas(canvas)
      {:error, %Ecto.Changeset{}}

  """
  def delete_canvas(%Canvas{} = canvas) do
    Repo.delete(canvas)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking canvas changes.

  ## Examples

      iex> change_canvas(canvas)
      %Ecto.Changeset{data: %Canvas{}}

  """
  def change_canvas(%Canvas{} = canvas, attrs \\ %{}) do
    Canvas.changeset(canvas, attrs)
  end
end
