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
    plug :fetch_current_user
  end

  pipeline :api do
    plug(:accepts, ["json", "image/png"])
    plug(:cors_plug)
    plug(:fetch_session)
    plug(:fetch_current_user)
  end

  pipeline :tile_radius_check do
    plug(UdrawWeb.Plugs.TileRadiusCheck)
  end

  scope "/", UdrawWeb do
    pipe_through(:browser)

    get("/", PageController, :home)

    live "/canvases", CanvasLive.Index, :index
    live "/canvases/new", CanvasLive.Index, :new
    live "/canvases/:id/edit", CanvasLive.Index, :edit

    live "/canvases/:id", CanvasLive.Show, :show
    live "/canvases/:id/show/edit", CanvasLive.Show, :edit

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
      pipe_through([:browser, :require_admin_user])

      live_dashboard("/dashboard", metrics: UdrawWeb.Telemetry)
      forward("/mailbox", Plug.Swoosh.MailboxPreview)
    end
  end

  ## Authentication routes

  scope "/", UdrawWeb do
    pipe_through [:browser, :redirect_if_user_is_authenticated]

    live_session :redirect_if_user_is_authenticated,
      on_mount: [{UdrawWeb.UserAuth, :redirect_if_user_is_authenticated}] do
      live "/users/register", UserRegistrationLive, :new
      live "/users/log_in", UserLoginLive, :new
      live "/users/reset_password", UserForgotPasswordLive, :new
      live "/users/reset_password/:token", UserResetPasswordLive, :edit
    end

    post "/users/log_in", UserSessionController, :create
  end

  scope "/", UdrawWeb do
    pipe_through [:browser, :require_authenticated_user]

    live_session :require_authenticated_user,
      on_mount: [{UdrawWeb.UserAuth, :ensure_authenticated}] do
      live "/users/settings", UserSettingsLive, :edit
      live "/users/settings/confirm_email/:token", UserSettingsLive, :confirm_email
    end
  end

  scope "/", UdrawWeb do
    pipe_through [:browser]

    delete "/users/log_out", UserSessionController, :delete

    live_session :current_user,
      on_mount: [{UdrawWeb.UserAuth, :mount_current_user}] do
      live "/users/confirm/:token", UserConfirmationLive, :edit
      live "/users/confirm", UserConfirmationInstructionsLive, :new
    end
  end
end
