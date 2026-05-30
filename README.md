# 🐞 FRE Information Panel

ROS 2 package + React/Vite web UI for displaying information alerts (plant health, pest detection, etc.).

The project uses `rclnodejs/web` as the browser bridge and is containerised through the `aoc_container_base` stack.

## Topics

### Alerts

- Topic: `/information_panel/alert`
- Message type: `std_msgs/msg/String`
- Expected options: `[ "bee", "butterfly", "ladybird", "diseased_plant" ]`
- Can be passed as `bee,butterfly` when both are detected.
- Example: `diseased_plant` for diseased plant classification.

## Architecture

- ROS package: src/fre_information_panel
- Frontend: React + Vite (served on port 5173)
- Bridge: rclnodejs-web WebSocket capability endpoint proxied at `/capability` on port 5173
- Runtime command: `ros2 launch fre_information_panel web.launch.py`

## ROS + Node Coupling

This package is intentionally coupled so ROS tooling also drives the Node build.

- rosdep installs system dependencies from package.xml, including nodejs.
- colcon build triggers npm install and npm run build via CMake custom target.
- ros2 launch starts the UI and bridge as separate processes.
- The UI display timeout is configurable with the launch argument idle_ms.
- Runtime requires Node.js `>=24.11.1 <25` (see `.nvmrc`, `package.json` engines, and Dockerfile configuration).

## Devcontainer Usage

1. Open the repository in VS Code.
2. Run Dev Containers: Rebuild and Reopen in Container.
3. The devcontainer uses [.devcontainer/compose.yaml](.devcontainer/compose.yaml) and automatically builds the workspace during container startup.
4. The ROS environment is sourced automatically for the devcontainer session.

If you want to run the same container stack outside VS Code, use the compose file directly:

```bash
docker compose -f .devcontainer/compose.yaml up --build
```

## Build and Run

From inside the devcontainer, start the panel with:

```bash
ros2 launch fre_information_panel web.launch.py
```

This launch file starts two processes separately:

- the rclnodejs/web bridge
- the UI static server

To change how long text remains visible after the most recent topic update:

```bash
ros2 launch fre_information_panel web.launch.py idle_ms:=5000
```

Services exposed:

- UI: http://localhost:5173
- WebSocket bridge (proxied): ws://localhost:5173/capability

The bridge path is runtime-configurable in Docker with `FRE_INFORMATION_PANEL_BRIDGE_ENDPOINT` (defaults to `/capability`), while the browser always connects through the same host it loaded the UI from.

## Rebuilding After Changes

The devcontainer already performs the initial build and environment setup for you.

If you change the package and need to rebuild it manually, run colcon from /workspace so the cached build, install, and log volumes are reused:

```bash
cd /workspace
colcon build --packages-select fre_information_panel
```

## Formatting and Lint Checks

Run style checks from the frontend package directory:

```bash
cd /workspace/src/fre_information_panel
```

Check formatting only:

```bash
npm run format:check
```

Check lint only:

```bash
npm run lint
```

Run both checks together (same command used by CI):

```bash
npm run style
```

To automatically apply formatting changes:

```bash
npm run format
```

## Functional Test

1. Start the panel with:

```bash
ros2 launch fre_information_panel web.launch.py
```

2. Open http://localhost:5173 (or hostname:5173 if connecting remotely).
   - Add `?sound=off` (for example `http://localhost:5173/?sound=off`) to disable rendering the audio player UI.

3. Publish a test message from another ROS terminal in the same domain:

```bash
ros2 topic pub /information_panel/alert std_msgs/msg/String "{data: 'bee'}"
ros2 topic pub /information_panel/alert std_msgs/msg/String "{data: 'butterfly'}"
ros2 topic pub /information_panel/alert std_msgs/msg/String "{data: 'ladybird'}"
ros2 topic pub /information_panel/alert std_msgs/msg/String "{data: 'diseased_plant'}"
ros2 topic pub /information_panel/alert std_msgs/msg/String "{data: 'bee,ladybird'}"
ros2 topic pub /information_panel/alert std_msgs/msg/String "{data: 'bee,butterfly'}"
ros2 topic pub /information_panel/alert std_msgs/msg/String "{data: 'bee,butterfly,ladybird'}"
```

4. Confirm the page updates to display the alert.

## Optional Hot-Reload UI Workflow

The default workflow is ROS-first via ros2 launch. For frontend iteration only, you can run the bridge from ROS and the UI from Vite with hot reload.

1. Start only the bridge:

```bash
ros2 launch fre_information_panel web.launch.py start_ui:=false
```

2. In a second terminal, start the Vite dev server from the package source tree:

```bash
cd /workspace/src/fre_information_panel
npm run dev
```

3. Open the hot-reload UI at http://localhost:5173.

This mode is intended for development only and is not the default workflow.

## Docker Image Build

The CI workflow builds .devcontainer/Dockerfile target final.

Manual build:

```bash
docker build -t fre-information-panel --target final -f .devcontainer/Dockerfile .
```

Manual run:

```bash
docker run --rm -p 5173:5173 fre-information-panel
```
