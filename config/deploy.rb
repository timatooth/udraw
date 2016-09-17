# config valid only for current version of Capistrano
lock '3.6.1'

set :application, 'udraw'
set :repo_url, 'git@github.com:timatooth/udraw.git'

# Default branch is :master
# ask :branch, `git rev-parse --abbrev-ref HEAD`.chomp

# Default deploy_to directory is /var/www/my_app_name
 set :deploy_to, '/opt/capistrano/udraw'

# Default value for :scm is :git
# set :scm, :git

desc "Setup supervisor process"
task :export_supervisor do
  on roles(:app) do |host|
    within release_path do
      execute :sudo, "foreman export supervisord -a udraw -p 3000 -u www-data -l /var/log /etc/supervisor/conf.d"
    end
  end
end

desc "Reload supervisor"
task :reread_supervisor do
  on roles(:app) do |host|
    within release_path do
      execute :sudo, "supervisorctl reread"
    end
  end
end

desc "Restart app"
task :restart_udraw do
  on roles(:app) do |host|
    within release_path do
      execute :sudo, "supervisorctl update && supervisorctl restart udraw"
    end
  end
end


after "deploy:published", "export_supervisor"
after "export_supervisor", "reread_supervisor"
after "reread_supervisor", "restart_udraw"
# desc 'Restart application'
# task :restart do
#   on roles(:app), in: :sequence, wait: 5 do
#     execute "sudo supervisorctl reread"
#     execute "sudo supervisorctl restart udraw"
#   end
# end



# Default value for :format is :airbrussh.
# set :format, :airbrussh

# You can configure the Airbrussh format using :format_options.
# These are the defaults.
# set :format_options, command_output: true, log_file: 'log/capistrano.log', color: :auto, truncate: :auto

# Default value for :pty is false
# set :pty, true

# Default value for :linked_files is []
# append :linked_files, 'config/database.yml', 'config/secrets.yml'

# Default value for linked_dirs is []
# append :linked_dirs, 'log', 'tmp/pids', 'tmp/cache', 'tmp/sockets', 'public/system'

# Default value for default_env is {}
# set :default_env, { path: "/opt/ruby/bin:$PATH" }

# Default value for keep_releases is 5
# set :keep_releases, 5
