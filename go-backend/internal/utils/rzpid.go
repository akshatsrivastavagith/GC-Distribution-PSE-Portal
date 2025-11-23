package utils

import (
	cryptorand "crypto/rand"
	"encoding/binary"
	"fmt"
	"math/rand"
	"time"
)

const (
	// Base62 character set
	base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	// Random integer ceil value
	maxRandomIntCeil int64 = 9999999999999
	// UUID size
	expectedIDSize int = 14
	// Timestamp of 1st Jan 2014 in nanoseconds
	firstJan2014EpochTs int64 = 1388534400 * 1000 * 1000 * 1000
)

func init() {
	rand.Seed(int64(randUint32()))
}

// randUint32 returns a random uint32 using crypto/rand
func randUint32() uint32 {
	buf := make([]byte, 4)
	if _, err := cryptorand.Read(buf); err != nil {
		panic(fmt.Errorf("failed to read random bytes: %v", err))
	}
	return binary.BigEndian.Uint32(buf)
}

// base62Encode encodes a number to base62 string
func base62Encode(num int64) string {
	if num == 0 {
		return "0"
	}
	
	res := ""
	for num > 0 {
		res = string(base62Chars[num%62]) + res
		num = num / 62
	}
	return res
}

// GenerateRzpID generates a 14-character Razorpay-style UUID
// Format: [10 chars from timestamp][4 chars random] = 14 chars total
func GenerateRzpID() string {
	nanotime := time.Now().UnixNano()
	random := rand.Int63n(maxRandomIntCeil)
	
	// Encode random number to base62
	base62Rand := base62Encode(random)
	
	// Ensure exactly 4 chars (take last 4 if longer, pad with 0 if shorter)
	if len(base62Rand) > 4 {
		base62Rand = base62Rand[len(base62Rand)-4:]
	}
	base62Rand = fmt.Sprintf("%04s", base62Rand)
	
	// Encode timestamp to base62
	b62Time := base62Encode(nanotime - firstJan2014EpochTs)
	
	// Combine timestamp + random
	id := b62Time + base62Rand
	
	// Ensure exactly 14 characters
	if len(id) != expectedIDSize {
		// If too short, pad with leading zeros
		if len(id) < expectedIDSize {
			id = fmt.Sprintf("%014s", id)
		} else if len(id) > expectedIDSize {
			// If too long (shouldn't happen), take last 14 chars
			id = id[len(id)-expectedIDSize:]
		}
	}
	
	// Return just the 14-character ID without any prefix
	return id
}

// GenerateRunID generates a unique run ID
func GenerateRunID(filename string) string {
	timestamp := time.Now().Format("2006-01-02T15-04-05")
	return fmt.Sprintf("%s_%s", filename, timestamp)
}

