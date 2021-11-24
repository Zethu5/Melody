#!/bin/bash

error_text=`cat info.log | grep 'Error:*'`

if [ ! -z "$error_text" ]
then
        kill -9 `pgrep node`
else
        exit 0
fi