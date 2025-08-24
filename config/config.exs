# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :udraw, :scopes,
  user: [
    default: true,
    module: Udraw.Accounts.Scope,
    assign_key: :current_scope,
    access_path: [:user, :id],
    schema_key: :user_id,
    schema_type: :binary_id,
    schema_table: :users,
    test_data_fixture: Udraw.AccountsFixtures,
    test_setup_helper: :register_and_log_in_user
  ]

config :udraw,
  ecto_repos: [Udraw.Repo],
  generators: [timestamp_type: :utc_datetime],
  s3_bucket: "udraw-tiles",
  storage_dir: "original_tiles/",
  adapter: Udraw.DiskAdapter

# Configures the endpoint
config :udraw, UdrawWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [html: UdrawWeb.ErrorHTML, json: UdrawWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Udraw.PubSub,
  live_view: [signing_salt: "GHqO1JlT"]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :udraw, Udraw.Mailer, adapter: Swoosh.Adapters.Local

# Configure esbuild (the version is required)
config :esbuild,
  version: "0.25.9",
  udraw: [
    args:
      ~w(js/app.js css/udraw.css vendor/udraw/js/udraw.js --bundle --target=es2017 --outdir=../priv/static/assets --loader:.js=jsx --loader:.css=css --loader:.png=file --loader:.jpg=file --loader:.ttf=file --loader:.woff=file --loader:.eot=file --loader:.woff2=file --loader:.svg=file),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => [Path.expand("../deps", __DIR__), Mix.Project.build_path()]}
  ]

# Configure tailwind (the version is required)
config :tailwind,
  version: "4.1.12",
  udraw: [
    args: ~w(
      --input=assets/css/app.css
      --output=priv/static/assets/css/app.css
    ),
    cd: Path.expand("..", __DIR__)
  ]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"

config :ex_aws,
  region: "ap-southeast-2",
  access_key_id: [{:system, "AWS_ACCESS_KEY_ID"}, {:awscli, "timatooth", 30}, :instance_role],
  secret_access_key: [
    {:system, "AWS_SECRET_ACCESS_KEY"},
    {:awscli, "timatooth", 30},
    :instance_role
  ]
