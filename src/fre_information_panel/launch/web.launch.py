from pathlib import Path

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import ExecuteProcess


def generate_launch_description():
    package_share = Path(get_package_share_directory('fre_information_panel'))

    return LaunchDescription([
        ExecuteProcess(
            cmd=['npm', 'run', 'start:bridge'],
            cwd=str(package_share),
            output='screen',
            name='fre_information_panel_bridge',
        ),
        ExecuteProcess(
            cmd=['npm', 'run', 'start:ui'],
            cwd=str(package_share),
            output='screen',
            name='fre_information_panel_ui',
        ),
    ])
