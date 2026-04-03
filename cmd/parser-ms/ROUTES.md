# ROUTES

## GET /health

Returns a 200 status code if the server is running and a `OK` message.

## POST /upload-log

Receives a FC flight log file from the frontend and parses it.

**Query Parameters**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| file_name | string | Yes | The name of the file to be uploaded. |


**Request Body**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| file | file | Yes | The file to be uploaded. |

**Responses**

Success: *200 OK*

```json
{

}
```

Error: *400 Bad Request*

```json
{
    "error": "Error reading file name"
}
```

