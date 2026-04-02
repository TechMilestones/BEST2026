package logparser

import (
	"fmt"
	"io"

	"github.com/pryamcem/go-dataflash"
)

type GPSData struct {
	Instance int
	TimeUS   int64
	Lat      float64
	Lng      float64
	Alt      float64
}

type IMUData struct {
	Instance int
	TimeUS   int64
	AccX     float64
	AccY     float64
	AccZ     float64
}

type ATTData struct {
	Instance int
	TimeUS   int64
	Roll     float64
	Pitch    float64
	Yaw      float64
}

type LogData struct {
	GPS []GPSData
	IMU []IMUData
	ATT []ATTData
}

func Parse(r io.ReadSeeker) (*LogData, error) {
	parser, err := dataflash.NewParserFromReader(r)
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
		instance := 0
		if instRaw != nil {
			if v, ok := instRaw.(float64); ok {
				instance = int(v)
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
					AccX:     accXRaw.(float64),
					AccY:     accYRaw.(float64),
					AccZ:     accZRaw.(float64),
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
					Roll:     rollRaw.(float64),
					Pitch:    pitchRaw.(float64),
					Yaw:      yawRaw.(float64),
				})
			}
		}
	}

	return data, nil
}
