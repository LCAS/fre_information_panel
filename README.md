# FRE Information Panel

ROS 2 package + React/Vite web UI for displaying bug detection text from the ROS topic:

- Topic: /bug_detection/detected_bugs
- Message type: std_msgs/msg/String
- UI output: message text rendered in a p tag

The project uses rclnodejs/web as the browser bridge and is containerized through the existing devcontainer Dockerfile and CI pipeline.

## Architecture

- ROS package: src/fre_information_panel
- Frontend: React + Vite (served on port 5173)
- Bridge: rclnodejs-web WebSocket capability endpoint (port 9000)
- Runtime command: ros2 launch fre_information_panel web.launch.py

## ROS + Node Coupling

This package is intentionally coupled so ROS tooling also drives the Node build.

- rosdep installs system dependencies from package.xml, including nodejs.
- colcon build triggers npm install and npm run build via CMake custom target.
- ros2 launch starts the UI and bridge as separate processes.
- The UI display timeout is configurable with the launch argument idle_ms.
- Dockerfile also pins Node.js 22 to keep runtime consistent with your requirement.

## Devcontainer Usage

1. Open the repository in VS Code.
2. Run Dev Containers: Rebuild and Reopen in Container.
3. The devcontainer uses [.devcontainer/compose.yaml](.devcontainer/compose.yaml) and automatically builds the workspace during container startup.
4. The ROS environment is sourced automatically for the devcontainer session.

If you want to run the same container stack outside VS Code, use the compose file directly:

	docker compose -f .devcontainer/compose.yaml up --build

## Build and Run

From inside the devcontainer, start the panel with:

	ros2 launch fre_information_panel web.launch.py

This launch file starts two processes separately:

- the rclnodejs/web bridge
- the UI static server

To change how long text remains visible after the most recent topic update:

	ros2 launch fre_information_panel web.launch.py idle_ms:=5000

Services exposed:

- UI: http://localhost:5173
- WebSocket bridge: ws://localhost:9000/capability

## Rebuilding After Changes

The devcontainer already performs the initial build and environment setup for you.

If you change the package and need to rebuild it manually, run colcon from /workspace so the cached build, install, and log volumes are reused:

	cd /workspace
	colcon build --packages-select fre_information_panel

## Functional Test

1. Open http://localhost:5173.
2. Start the panel with:

	ros2 launch fre_information_panel web.launch.py

3. Publish a test message from another ROS terminal in the same domain:

	ros2 topic pub /bug_detection/detected_bugs std_msgs/msg/String "{data: 'Bug found'}"

4. Confirm the page p element updates to Bug found.

## Optional Hot-Reload UI Workflow

The default workflow is ROS-first via ros2 launch. For frontend iteration only, you can run the bridge from ROS and the UI from Vite with hot reload.

1. Start only the bridge:

	ros2 launch fre_information_panel web.launch.py start_ui:=false

2. In a second terminal, start the Vite dev server from the package source tree:

	cd /workspace/src/fre_information_panel
	npm run dev

3. Open the hot-reload UI at http://localhost:5173.

This mode is intended for development only and is not the default team workflow.

## Docker Image Build

The existing CI workflow builds .devcontainer/Dockerfile target final.

Manual build:

	docker build -t fre-information-panel --target final -f .devcontainer/Dockerfile .

Manual run:

	docker run --rm -p 5173:5173 -p 9000:9000 fre-information-panel
