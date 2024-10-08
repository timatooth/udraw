defmodule Udraw.S3AdapterTest do
  use ExUnit.Case
  alias Udraw.S3Adapter

  @bucket_name "test-bucket"

  setup do
    Application.put_env(:udraw, :s3_bucket, @bucket_name)
    :ok
  end

  test "path_to_key generates correct S3 key" do
    assert S3Adapter.path_to_key("main", "1", "0", "0") == "main/1/0/0.png"
  end
end
