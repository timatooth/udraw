defmodule Udraw.EmailTemplates do
  defmodule MagicLink do
    @moduledoc """
    Template for welcoming new users to the system.
    """
    use MjmlEEx, mjml_template: "mail_templates/magic_link_instructions.mjml.eex"

    def render_html(email, url) do
      current_year = Calendar.strftime(Date.utc_today(), "%Y")

      render(
        email: email,
        url: url,
        current_year: current_year
      )
    end
  end
end
