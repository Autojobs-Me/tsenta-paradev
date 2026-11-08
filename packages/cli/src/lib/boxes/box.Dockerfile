# The image every box starts from, on Daytona, E2B and Blaxel alike. It is
# what a Paradev cloud box ships (packages/sandbox/src/image.ts and the
# bundle's Aptfiles), minus the VNC desktop and the pieces that only work
# behind Paradev's control plane. Providers cache builds by content, so
# changing a line here rebuilds every provider's image on its next create.
FROM node:24-bookworm

ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		sudo zsh tmux git-lfs jq ripgrep sqlite3 rsync zip unzip less vim nano \
		htop lsof procps iproute2 dnsutils netcat-openbsd inotify-tools pigz \
		python3-pip python3-venv pipx universal-ctags ca-certificates gnupg \
	&& curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
		-o /usr/share/keyrings/githubcli-archive-keyring.gpg \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
		> /etc/apt/sources.list.d/github-cli.list \
	&& apt-get update && apt-get install -y --no-install-recommends gh \
	&& rm -rf /var/lib/apt/lists/*

# Paradev's boxes run as `ubuntu` (uid 1000) with passwordless sudo; agent
# CLIs refuse their skip-permissions modes as root. The node image's uid-1000
# user becomes that user.
RUN usermod -l ubuntu -d /home/ubuntu -m node \
	&& groupmod -n ubuntu node \
	&& echo 'ubuntu ALL=(ALL) NOPASSWD:SETENV: ALL' > /etc/sudoers.d/ubuntu \
	&& chmod 0440 /etc/sudoers.d/ubuntu \
	&& npm install -g @openai/codex \
	&& rm -f /etc/machine-id /var/lib/dbus/machine-id

# Login-shell env. SSH_CONNECTION tells CLIs the person is on another
# machine, so copy reaches their clipboard over OSC 52 and URL launchers print
# instead of opening; resources.env is the box's cgroup limits (see bootstrap).
RUN printf '%s\n' \
		'export LANG="${LANG:-C.UTF-8}" LC_ALL="${LC_ALL:-C.UTF-8}"' \
		'case ":$PATH:" in *":$HOME/superset/bin:"*) ;; *) export PATH="$HOME/superset/bin:$HOME/.local/bin:$HOME/.bun/bin:$PATH" ;; esac' \
		'export SSH_CONNECTION="${SSH_CONNECTION:-127.0.0.1 0 127.0.0.1 0}"' \
		'[ -r /etc/paradev-box/resources.env ] && . /etc/paradev-box/resources.env' \
		> /etc/profile.d/paradev-box.sh \
	&& chmod 0644 /etc/profile.d/paradev-box.sh

USER ubuntu
WORKDIR /home/ubuntu
RUN curl -fsSL https://bun.sh/install | bash \
	&& curl -fsSL https://claude.ai/install.sh | bash \
	&& curl -fsSL https://paradev.com/cli/install.sh -o /tmp/install.sh \
	&& SUPERSET_HOME="$HOME/superset" SUPERSET_VERSION=latest sh /tmp/install.sh --no-next-steps \
	&& rm /tmp/install.sh \
	&& printf '%s\n' '[ -r /etc/profile.d/paradev-box.sh ] && . /etc/profile.d/paradev-box.sh' >> "$HOME/.zshrc" \
	&& printf '%s\n' '[ -r /etc/profile.d/paradev-box.sh ] && . /etc/profile.d/paradev-box.sh' >> "$HOME/.bashrc"
