defmodule UdrawWeb.Router do
  use UdrawWeb, :router

  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:fetch_live_flash)
    plug(:put_root_layout, html: {UdrawWeb.Layouts, :root})
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
  end

  pipeline :api do
    plug(:accepts, ["json", "image/png"])
    plug(:cors_plug)
  end

  pipeline :tile_radius_check do
    plug(UdrawWeb.Plugs.TileRadiusCheck)
  end

  scope "/", UdrawWeb do
    pipe_through(:browser)

    get("/", PageController, :home)
  end

  scope "/api", UdrawWeb do
    pipe_through([:api, :tile_radius_check])

    options("/canvases/:name/:zoom/:x/:y", TileController, :options)
    put("/canvases/:name/:zoom/:x/:y", TileController, :put_tile)
    get("/canvases/:name/:zoom/:x/:y", TileController, :get_tile)
  end

  defp cors_plug(conn, _opts) do
    conn
    |> UdrawWeb.Cors.call([])
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:udraw, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through(:browser)

      live_dashboard("/dashboard", metrics: UdrawWeb.Telemetry)
      forward("/mailbox", Plug.Swoosh.MailboxPreview)
    end
  end
end
