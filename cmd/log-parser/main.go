package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"hackaton-test/log-parser"
)

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

	f, err := os.Open(binFilePath)
	if err != nil {
		log.Printf("Failed to open %s: %v\n", binFilePath, err)
		return
	}
	defer f.Close()

	data, err := logparser.Parse(f)
	if err != nil {
		log.Printf("Failed to parse %s: %v\n", binFilePath, err)
		return
	}

	baseName := strings.TrimSuffix(filepath.Base(binFilePath), filepath.Ext(binFilePath))

	writeGPS(baseName, data.GPS)
	writeIMU(baseName, data.IMU)
	writeATT(baseName, data.ATT)

	log.Printf("Done! Successfully processed %s\n", binFilePath)
}

func writeGPS(baseName string, data []logparser.GPSData) {
	writers := make(map[int]*csv.Writer)
	files := make(map[int]*os.File)
	defer func() {
		for _, w := range writers {
			w.Flush()
		}
		for _, f := range files {
			f.Close()
		}
	}()

	for _, d := range data {
		w, ok := writers[d.Instance]
		if !ok {
			fileName := fmt.Sprintf("%s_gps_%d.csv", baseName, d.Instance)
			f, err := os.Create(fileName)
			if err != nil {
				log.Printf("Failed to create %s: %v\n", fileName, err)
				continue
			}
			w = csv.NewWriter(f)
			w.Write([]string{"TimeUS", "Lat", "Lng", "Alt"})
			writers[d.Instance] = w
			files[d.Instance] = f
			fmt.Println(fileName)
		}
		w.Write([]string{
			fmt.Sprintf("%d", d.TimeUS),
			fmt.Sprintf("%v", d.Lat),
			fmt.Sprintf("%v", d.Lng),
			fmt.Sprintf("%v", d.Alt),
		})
	}
}

func writeIMU(baseName string, data []logparser.IMUData) {
	writers := make(map[int]*csv.Writer)
	files := make(map[int]*os.File)
	defer func() {
		for _, w := range writers {
			w.Flush()
		}
		for _, f := range files {
			f.Close()
		}
	}()

	for _, d := range data {
		w, ok := writers[d.Instance]
		if !ok {
			fileName := fmt.Sprintf("%s_imu_%d.csv", baseName, d.Instance)
			f, err := os.Create(fileName)
			if err != nil {
				log.Printf("Failed to create %s: %v\n", fileName, err)
				continue
			}
			w = csv.NewWriter(f)
			w.Write([]string{"TimeUS", "AccX", "AccY", "AccZ"})
			writers[d.Instance] = w
			files[d.Instance] = f
			fmt.Println(fileName)
		}
		w.Write([]string{
			fmt.Sprintf("%d", d.TimeUS),
			fmt.Sprintf("%v", d.AccX),
			fmt.Sprintf("%v", d.AccY),
			fmt.Sprintf("%v", d.AccZ),
		})
	}
}

func writeATT(baseName string, data []logparser.ATTData) {
	writers := make(map[int]*csv.Writer)
	files := make(map[int]*os.File)
	defer func() {
		for _, w := range writers {
			w.Flush()
		}
		for _, f := range files {
			f.Close()
		}
	}()

	for _, d := range data {
		w, ok := writers[d.Instance]
		if !ok {
			fileName := fmt.Sprintf("%s_att_%d.csv", baseName, d.Instance)
			f, err := os.Create(fileName)
			if err != nil {
				log.Printf("Failed to create %s: %v\n", fileName, err)
				continue
			}
			w = csv.NewWriter(f)
			w.Write([]string{"TimeUS", "Roll", "Pitch", "Yaw"})
			writers[d.Instance] = w
			files[d.Instance] = f
			fmt.Println(fileName)
		}
		w.Write([]string{
			fmt.Sprintf("%d", d.TimeUS),
			fmt.Sprintf("%v", d.Roll),
			fmt.Sprintf("%v", d.Pitch),
			fmt.Sprintf("%v", d.Yaw),
		})
	}
}
