package main

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/pryamcem/go-dataflash"
)

type csvWriterKey struct {
	Name     string
	Instance string
}
func main() {
	if len(os.Args) < 2 {
		log.Fatalf("Usage: %s <bin_file1> <bin_file2> ...\n", os.Args[0])
	}

	for _, file := range os.Args[1:] {
		processBinFile(file)
	}
}

func processBinFile(binFilePath string) {
	log.Printf("Processing %s...\n", binFilePath)

	parser, err := dataflash.NewParser(binFilePath)
	if err != nil {
		log.Printf("Failed to open %s: %v\n", binFilePath, err)
		return
	}
	defer parser.Close()

	parser.SetFilter("GPS", "IMU", "ATT")

	baseName := strings.TrimSuffix(filepath.Base(binFilePath), filepath.Ext(binFilePath))

	writers := make(map[csvWriterKey]*csv.Writer)
	outputFiles := make(map[csvWriterKey]*os.File)
	generatedFiles := make([]string, 0)

	defer func() {
		for key, writer := range writers {
			writer.Flush()
			outputFiles[key].Close()
		}
		for _, f := range generatedFiles {
			fmt.Println(f)
		}
	}()

	getWriter := func(name string, instance any) *csv.Writer {
		instStr := "0"
		if instance != nil {
			instStr = fmt.Sprintf("%v", instance)
		}
		key := csvWriterKey{Name: name, Instance: instStr}
		if w, ok := writers[key]; ok {
			return w
		}

		fileName := fmt.Sprintf("%s_%s_%s.csv", baseName, strings.ToLower(name), instStr)
		f, err := os.Create(fileName)
		if err != nil {
			log.Fatalf("Failed to create csv %s: %v\n", fileName, err)
		}
		outputFiles[key] = f
		generatedFiles = append(generatedFiles, fileName)
		w := csv.NewWriter(f)
		writers[key] = w

		// Write headers
		switch name {
		case "GPS":
			w.Write([]string{"TimeUS", "Lat", "Lng", "Alt"})
		case "IMU":
			w.Write([]string{"TimeUS", "AccX", "AccY", "AccZ"})
		case "ATT":
			w.Write([]string{"TimeUS", "Roll", "Pitch", "Yaw"})
		}
		return w
	}

	messageCount := 0
	for {
		msg, err := parser.ReadMessage()
		if err != nil {
			if err == io.EOF || err == io.ErrUnexpectedEOF {
				break
			}
			log.Printf("Warning: error reading message at count %d: %v\n", messageCount, err)
			continue
		}

		timeUsRaw, _, err := msg.GetScaled("TimeUS")
		if err != nil {
			continue
		}
		timeUs := fmt.Sprintf("%.0f", timeUsRaw.(float64)*1000000)

		instRaw, _, _ := msg.GetScaled("I")
		writer := getWriter(msg.Name, instRaw)

		switch msg.Name {
		case "GPS":
			latRaw, _, err1 := msg.GetScaled("Lat")
			lngRaw, _, err2 := msg.GetScaled("Lng")
			altRaw, _, err3 := msg.GetScaled("Alt")
			if err1 == nil && err2 == nil && err3 == nil {
				writer.Write([]string{timeUs, fmt.Sprintf("%v", latRaw), fmt.Sprintf("%v", lngRaw), fmt.Sprintf("%v", altRaw)})
			}
		case "IMU":
			accXRaw, _, err1 := msg.GetScaled("AccX")
			accYRaw, _, err2 := msg.GetScaled("AccY")
			accZRaw, _, err3 := msg.GetScaled("AccZ")
			if err1 == nil && err2 == nil && err3 == nil {
				writer.Write([]string{timeUs, fmt.Sprintf("%v", accXRaw), fmt.Sprintf("%v", accYRaw), fmt.Sprintf("%v", accZRaw)})
			}
		case "ATT":
			rollRaw, _, err1 := msg.GetScaled("Roll")
			pitchRaw, _, err2 := msg.GetScaled("Pitch")
			yawRaw, _, err3 := msg.GetScaled("Yaw")
			if err1 == nil && err2 == nil && err3 == nil {
				writer.Write([]string{timeUs, fmt.Sprintf("%v", rollRaw), fmt.Sprintf("%v", pitchRaw), fmt.Sprintf("%v", yawRaw)})
			}
		}

		messageCount++
	}

	log.Printf("Done! Successfully processed %s and wrote %d messages.\n", binFilePath, messageCount)
}
