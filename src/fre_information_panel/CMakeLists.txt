cmake_minimum_required(VERSION 3.8)
project(fre_information_panel)

find_package(ament_cmake REQUIRED)

find_program(NPM_EXECUTABLE npm REQUIRED)

add_custom_target(frontend_build ALL
	COMMAND ${NPM_EXECUTABLE} ci
	COMMAND ${NPM_EXECUTABLE} run build
	WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
	COMMENT "Installing Node.js dependencies and building Vite frontend"
)

install(
	DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist/
	DESTINATION share/${PROJECT_NAME}/dist
	OPTIONAL
)

install(
	DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/node_modules/
	DESTINATION share/${PROJECT_NAME}/node_modules
	USE_SOURCE_PERMISSIONS
	OPTIONAL
)

install(
	FILES
		${CMAKE_CURRENT_SOURCE_DIR}/web.json
		${CMAKE_CURRENT_SOURCE_DIR}/server.ts
		${CMAKE_CURRENT_SOURCE_DIR}/package.json
	DESTINATION share/${PROJECT_NAME}
)

install(
	DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/launch/
	DESTINATION share/${PROJECT_NAME}/launch
)

ament_package()
