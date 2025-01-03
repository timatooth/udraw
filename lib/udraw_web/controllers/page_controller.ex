defmodule UdrawWeb.PageController do
  use UdrawWeb, :controller

  def home(conn, _params) do
    # The home page is often custom made,
    # so skip the default app layout.
    #render(conn, :home, layout: false)
    render(conn, :udrawapplication, layout: :false)
  end
end
