defmodule UdrawWeb.Router do
  use UdrawWeb, :router

  import UdrawWeb.UserAuth

  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:fetch_live_flash)
    plug(:put_root_layout, html: {UdrawWeb.Layouts, :root})
    plug(:protect_from_forgery)
    plug(:put_secure_browser_headers)
    plug :fetch_current_scope_for_user
  end

  pipeline :api do
    plug(:accepts, ["json", "image/png"])
    plug(:cors_plug)
    plug(:fetch_session)
    plug :fetch_current_scope_for_user
  end

  pipeline :tile_radius_check do
    plug(UdrawWeb.Plugs.TileRadiusCheck)
  end

  scope "/", UdrawWeb do
    pipe_through(:browser)

    get("/", PageController, :home)

    live "/toolbar", ToolbarLive, :index
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
      pipe_through([:browser])

      live_dashboard("/dashboard", metrics: UdrawWeb.Telemetry)
      forward("/mailbox", Plug.Swoosh.MailboxPreview)
    end
  end

  ## Authentication routes

  scope "/", UdrawWeb do
    pipe_through [:browser, :require_authenticated_user]

    live_session :require_authenticated_user,
      on_mount: [{UdrawWeb.UserAuth, :require_authenticated}] do
      live "/users/settings", UserLive.Settings, :edit
      live "/users/settings/confirm-email/:token", UserLive.Settings, :confirm_email
    end

    post "/users/update-password", UserSessionController, :update_password
  end

  scope "/", UdrawWeb do
    pipe_through [:browser]

    live_session :current_user,
      on_mount: [{UdrawWeb.UserAuth, :mount_current_scope}] do
      live "/users/register", UserLive.Registration, :new
      live "/users/log-in", UserLive.Login, :new
      live "/users/log-in/:token", UserLive.Confirmation, :new
    end

    post "/users/log-in", UserSessionController, :create
    delete "/users/log-out", UserSessionController, :delete
  end
end
