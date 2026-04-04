# ROUTES

## GET /health

Returns a 200 status code if the server is running and a `OK` message.

## POST /upload-log

Receives a FC flight log file from the frontend and parses it.

**Request Body**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| file | file | Yes | The file to be uploaded. |

**Responses**

Success: *200 OK*

```json
{
    gps: [ 
        {
            "instance":0,
            "time_us":50814626,
            "lat":-35.3632649,
            "lng":149.1652374,
            "alt":584.85
        },
        ...
    ],
    imu: [ 
        {
            "instance":0,
            "time_us":50814626,
            "acc_x":-0.001000,
            "acc_y":-0.001000,
            "acc_z":-0.001000
        },
        ...
    ],
    att: [ 
        {
            "instance":0,
            "time_us":50654626,
            "roll":1.5106618,
            "pitch":70.11925,
            "yaw":359.9037
        },
        ...
    ]
}
```

Error: *400 Bad Request*

```json
{
    "error": "Error reading file name"
}
```

