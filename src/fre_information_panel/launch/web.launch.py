from pathlib import Path

from ament_index_python.packages import get_package_share_directory
from launch.conditions import IfCondition
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.substitutions import LaunchConfiguration


def generate_launch_description():
    package_share = Path(get_package_share_directory('fre_information_panel'))
    idle_ms = LaunchConfiguration('idle_ms')
    start_bridge = LaunchConfiguration('start_bridge')
    start_ui = LaunchConfiguration('start_ui')

    return LaunchDescription([
        DeclareLaunchArgument(
            'idle_ms',
            default_value='5000',
            description='Milliseconds to keep the detected alert visible after the last received message.',
        ),
        DeclareLaunchArgument(
            'start_bridge',
            default_value='true',
            description='Whether to start the rclnodejs/web bridge process.',
        ),
        DeclareLaunchArgument(
            'start_ui',
            default_value='true',
            description='Whether to start the static UI server process.',
        ),
        ExecuteProcess(
            cmd=['npm', 'run', 'start:bridge'],
            cwd=str(package_share),
            output='screen',
            name='fre_information_panel_bridge',
            condition=IfCondition(start_bridge),
        ),
        ExecuteProcess(
            cmd=['npm', 'run', 'start:ui'],
            cwd=str(package_share),
            output='screen',
            name='fre_information_panel_ui',
            additional_env={
                'FRE_INFORMATION_PANEL_IDLE_MS': idle_ms,
            },
            condition=IfCondition(start_ui),
        ),
    ])
