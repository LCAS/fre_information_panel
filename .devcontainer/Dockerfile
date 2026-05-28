ARG BASE_IMAGE=lcas.lincoln.ac.uk/ros:humble-latest
ARG ROS_DISTRO=humble

FROM ${BASE_IMAGE} AS devcontainer

ENV main_user=${USER:-root}
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    npm_config_update_notifier=false

USER root
RUN rm -rf /var/lib/apt/lists/* \
    && apt-get update --fix-missing \
    && apt-get -y install --no-install-recommends --fix-missing \
        bash-completion \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 24 via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
ENV ROS2_WS=/workspace
COPY src /workspace/src
RUN rosdep update --rosdistro ${ROS_DISTRO} \
    && apt-get update \
    && rosdep install --from-paths /workspace/src --ignore-src -r -y

USER ${main_user}

# Do an initial build to speed up development
RUN /bin/bash -lc "source /opt/ros/${ROS_DISTRO}/setup.bash && colcon build --continue-on-error"

# ----------------------------------------------------------------------------------------------------
FROM devcontainer AS final

RUN /bin/bash -lc "source /opt/ros/${ROS_DISTRO}/setup.bash && colcon build"

EXPOSE 5173

CMD ["/bin/bash", "-lc", "source /opt/ros/${ROS_DISTRO}/setup.bash && source /workspace/install/setup.bash && exec ros2 launch fre_information_panel web.launch.py"]