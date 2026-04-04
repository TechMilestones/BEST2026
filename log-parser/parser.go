package logparser

import (
	"fmt"
	"io"

	"github.com/pryamcem/go-dataflash"
)

type GPSData struct {
	Instance uint8   `json:"instance"`
	TimeUS   int64   `json:"time_us"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Alt      float64 `json:"alt"`
}

type IMUData struct {
	Instance uint8   `json:"instance"`
	TimeUS   int64   `json:"time_us"`
	AccX     float32 `json:"acc_x"`
	AccY     float32 `json:"acc_y"`
	AccZ     float32 `json:"acc_z"`
}

type ATTData struct {
	Instance uint8   `json:"instance"`
	TimeUS   int64   `json:"time_us"`
	Roll     float32 `json:"roll"`
	Pitch    float32 `json:"pitch"`
	Yaw      float32 `json:"yaw"`
}

type LogData struct {
	GPS []GPSData `json:"gps"`
	IMU []IMUData `json:"imu"`
	ATT []ATTData `json:"att"`
}

func Parse(r io.ReadSeeker) (*LogData, error) {
	parser, err := dataflash.NewParserFromSource(r)
	if err != nil {
		return nil, fmt.Errorf("failed to create parser: %w", err)
	}
	defer parser.Close()

	parser.SetFilter("GPS", "IMU", "ATT")

	data := &LogData{
		GPS: make([]GPSData, 0),
		IMU: make([]IMUData, 0),
		ATT: make([]ATTData, 0),
	}

	for {
		msg, err := parser.ReadMessage()
		if err != nil {
			if err == io.EOF || err == io.ErrUnexpectedEOF {
				break
			}
			continue
		}

		timeUsRaw, _, err := msg.GetScaled("TimeUS")
		if err != nil {
			continue
		}
		timeUs := int64(timeUsRaw.(float64) * 1000000)

		instRaw, _, _ := msg.GetScaled("I")
		instance := uint8(0)
		if instRaw != nil {
			if v, ok := instRaw.(uint8); ok {
				instance = v
			}
		}

		switch msg.Name {
		case "GPS":
			latRaw, _, err1 := msg.GetScaled("Lat")
			lngRaw, _, err2 := msg.GetScaled("Lng")
			altRaw, _, err3 := msg.GetScaled("Alt")
			if err1 == nil && err2 == nil && err3 == nil {
				data.GPS = append(data.GPS, GPSData{
					Instance: instance,
					TimeUS:   timeUs,
					Lat:      latRaw.(float64),
					Lng:      lngRaw.(float64),
					Alt:      altRaw.(float64),
				})
			}
		case "IMU":
			accXRaw, _, err1 := msg.GetScaled("AccX")
			accYRaw, _, err2 := msg.GetScaled("AccY")
			accZRaw, _, err3 := msg.GetScaled("AccZ")
			if err1 == nil && err2 == nil && err3 == nil {
				data.IMU = append(data.IMU, IMUData{
					Instance: instance,
					TimeUS:   timeUs,
					AccX:     accXRaw.(float32),
					AccY:     accYRaw.(float32),
					AccZ:     accZRaw.(float32),
				})
			}
		case "ATT":
			rollRaw, _, err1 := msg.GetScaled("Roll")
			pitchRaw, _, err2 := msg.GetScaled("Pitch")
			yawRaw, _, err3 := msg.GetScaled("Yaw")
			if err1 == nil && err2 == nil && err3 == nil {
				data.ATT = append(data.ATT, ATTData{
					Instance: instance,
					TimeUS:   timeUs,
					Roll:     rollRaw.(float32),
					Pitch:    pitchRaw.(float32),
					Yaw:      yawRaw.(float32),
				})
			}
		}
	}

	return data, nil
}
