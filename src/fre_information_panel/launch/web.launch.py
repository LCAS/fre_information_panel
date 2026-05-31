from pathlib import Path

from ament_index_python.packages import get_package_share_directory
from launch.conditions import IfCondition
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, ExecuteProcess
from launch.substitutions import EnvironmentVariable, LaunchConfiguration


def generate_launch_description():
    package_share = Path(get_package_share_directory('fre_information_panel'))
    alert_persistence_ms = LaunchConfiguration('alert_persistence_ms')
    alert_announcement_with_introduction = LaunchConfiguration(
        'alert_announcement_with_introduction'
    )
    start_bridge = LaunchConfiguration('start_bridge')
    start_ui = LaunchConfiguration('start_ui')

    return LaunchDescription([
        DeclareLaunchArgument(
            'alert_persistence_ms',
            default_value=EnvironmentVariable(
                'FRE_INFORMATION_PANEL_ALERT_PERSISTENCE_MS', default_value='5000'
            ),
            description='Milliseconds to keep the detected alert visible after the last received message.',
        ),
        DeclareLaunchArgument(
            'alert_announcement_with_introduction',
            default_value=EnvironmentVariable(
                'FRE_INFORMATION_PANEL_ALERT_ANNOUNCEMENT_WITH_INTRODUCTION',
                default_value='true'
            ),
            description='Whether intro audio is enabled for alerts that opt into it.',
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
                'FRE_INFORMATION_PANEL_ALERT_PERSISTENCE_MS': alert_persistence_ms,
                'FRE_INFORMATION_PANEL_ALERT_ANNOUNCEMENT_WITH_INTRODUCTION': alert_announcement_with_introduction,
            },
            condition=IfCondition(start_ui),
        ),
    ])
