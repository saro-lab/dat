cmake_minimum_required(VERSION 3.15)
project(dat C)

set(CMAKE_C_STANDARD 11)

file(GLOB_RECURSE SOURCES src/*.c)

add_library(dat ${SOURCES} src/dat_util.h)

include(GenerateExportHeader)
generate_export_header(dat
        BASE_NAME DAT
        EXPORT_FILE_NAME ${CMAKE_CURRENT_BINARY_DIR}/include/dat_export.h
)
target_include_directories(dat PUBLIC $<BUILD_INTERFACE:${CMAKE_CURRENT_BINARY_DIR}/include>)

set_target_properties(dat PROPERTIES
        C_VISIBILITY_PRESET hidden
        VISIBILITY_INLINES_HIDDEN 1
)

if (MSVC)
    add_compile_options(/utf-8)
elseif (WIN32)
    add_compile_options(-fexec-charset=utf-8)
endif()

find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

# pthreads: prefer PThreads4W (vcpkg) on Windows, fall back to system Threads
find_package(PThreads4W QUIET)
if(PThreads4W_FOUND)
    set(DAT_PTHREAD_LIB PThreads4W::PThreads4W)
else()
    set(DAT_PTHREAD_LIB Threads::Threads)
endif()

# Optional curl for CmsManager HTTP support
find_package(CURL QUIET)

target_include_directories(dat PUBLIC
        $<BUILD_INTERFACE:${CMAKE_SOURCE_DIR}/include>
        $<BUILD_INTERFACE:${CMAKE_SOURCE_DIR}/src>
        $<INSTALL_INTERFACE:include>
)
target_link_libraries(dat PRIVATE OpenSSL::Crypto ${DAT_PTHREAD_LIB})

if (CURL_FOUND)
    target_compile_definitions(dat PRIVATE DAT_CMS_CURL)
    target_link_libraries(dat PRIVATE CURL::libcurl)
    message(STATUS "dat: CMS manager HTTP support enabled (libcurl found)")
else()
    message(STATUS "dat: CMS manager HTTP support disabled (libcurl not found)")
endif()

include(GNUInstallDirs)
install(TARGETS dat
        EXPORT dat-config
        ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
        LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
        RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)
install(DIRECTORY include/ DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
install(EXPORT dat-config DESTINATION ${CMAKE_INSTALL_DATADIR}/dat)

enable_testing()
file(GLOB_RECURSE TEST_SOURCES CONFIGURE_DEPENDS tests/*.c)

foreach(test_source ${TEST_SOURCES})
    get_filename_component(test_name ${test_source} NAME_WE)

    add_executable(${test_name} ${test_source} src/dat_util.h)
    target_link_libraries(${test_name} PRIVATE dat OpenSSL::Crypto ${DAT_PTHREAD_LIB})

    if (CURL_FOUND)
        target_compile_definitions(${test_name} PRIVATE DAT_CMS_CURL)
        target_link_libraries(${test_name} PRIVATE CURL::libcurl)
    endif()

    # example_cms_manager_test requires a live server; skip in automated CTest
    if (test_name STREQUAL "example_cms_manager_test")
        add_test(NAME ${test_name} COMMAND ${test_name})
        set_tests_properties(${test_name} PROPERTIES SKIP_RETURN_CODE 0)
    else()
        add_test(NAME ${test_name} COMMAND ${test_name})
    endif()
endforeach()
