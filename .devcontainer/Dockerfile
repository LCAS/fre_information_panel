ARG BASE_IMAGE=lcas.lincoln.ac.uk/ros:humble-latest
ARG ROS_DISTRO=humble
ARG NODE_VERSION=22.16.0

FROM ${BASE_IMAGE} AS devcontainer

ENV main_user=${USER:-root}

USER root
RUN rm -rf /var/lib/apt/lists/* \
    && apt-get update --fix-missing \
    && apt-get -y install --no-install-recommends --fix-missing \
        bash-completion \
        curl \
        xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Install a pinned Node.js runtime version.
RUN curl -fsSLO https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz \
    && tar -xJf node-v${NODE_VERSION}-linux-x64.tar.xz -C /usr/local --strip-components=1 --no-same-owner \
    && rm node-v${NODE_VERSION}-linux-x64.tar.xz \
    && node --version | grep -Fx "v${NODE_VERSION}"

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