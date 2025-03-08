defmodule Udraw.Compresser do
  @bucket_name Application.compile_env(:udraw, :s3_bucket)
  @tile_size 256
  @output_dir "original_tiles/main"

  def get_tiles(zoom_level) do
    objects =
      ExAws.S3.list_objects("#{@bucket_name}/main/#{zoom_level}")
      |> ExAws.stream!()
      |> Enum.to_list()

    Enum.flat_map(objects, fn object -> [object.key] end)
  end

  def get_local_tiles(zoom_level) do
    paths = Path.wildcard("original_tiles/main/#{zoom_level}/*/*.png")

    # Enum.map(paths, fn path ->
    #   String.replace(path, "original_tiles/", "")
    # end)
    paths
  end

  def generate_zoom_layers() do
    Enum.each(2..9, fn level ->
      zoom_pass(level)
    end)
  end

  def zoom_pass(zoom_level) do
    tiles = get_local_tiles(zoom_level - 1)
    IO.puts("Doing zoom level #{zoom_level}")
    grouped_tiles = group_tiles(tiles)

    Enum.each(grouped_tiles, fn {{new_x, new_y}, tile_group} ->
      output_path = "#{@output_dir}/#{zoom_level}/#{new_x}/#{new_y}.png"
      merge_and_scale(tile_group, output_path)
    end)
  end

  def group_tiles(tiles) do
    tiles
    |> Enum.group_by(fn path ->
      [_folder, _canvas, _zoom, x, y] = String.split(path, "/")
      y = String.replace(y, ".png", "")
      x_val = parse_int(x)
      y_val = parse_int(y)

      {floor(x_val / 2), floor(y_val / 2)}
    end)
  end

  def merge_and_scale(tile_group, output_path) do
    images =
      Enum.map(tile_group, fn path ->
        # image_file = download_image(path)
        image_file = open_file(path)

        case Image.open(image_file) do
          {:ok, img} -> {path, img}
          _ -> nil
        end
      end)
      |> Enum.filter(& &1)

    if images != [] do
      base = Image.new!(@tile_size * 2, @tile_size * 2, bands: 4)

      cobbeled =
        Enum.reduce(images, base, fn image, base ->
          {path, image} = image
          {x, y} = get_position(path)
          Image.compose!(base, image, x: x, y: y)
        end)

      # Resize to 256x256 and save
      downscaled = Image.resize!(cobbeled, 0.5)
      File.mkdir_p!(Path.dirname(output_path))
      Image.write!(downscaled, output_path)
    end
  end

  defp parse_int(string), do: String.to_integer(string)

  def download_image(key) do
    ExAws.S3.get_object(@bucket_name, key)
    |> ExAws.request!()
    |> Map.get(:body)
  end

  defp open_file(path) do
    File.read!(path)
  end

  # Determine position within 2x2 block
  defp get_position(path) do
    [_filename, _canvas, _zoom, x, y] = String.split(path, "/")
    y = String.replace(y, ".png", "")
    x = String.to_integer(x)
    y = String.to_integer(y)

    # Left (0) or Right (256)
    dx = if rem(x, 2) == 0, do: 0, else: 256
    # Top (0) or Bottom (256)
    dy = if rem(y, 2) == 0, do: 0, else: 256

    {dx, dy}
  end
end
