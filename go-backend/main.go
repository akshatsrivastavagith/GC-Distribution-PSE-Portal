package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"gc-distribution-portal/internal/api"
	"gc-distribution-portal/internal/config"
	"gc-distribution-portal/internal/middleware"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize router
	r := mux.NewRouter()

	// Initialize API handlers
	authHandler := api.NewAuthHandler(cfg)
	stockHandler := api.NewStockHandler(cfg)
	profileHandler := api.NewProfileHandler(cfg)
	passwordRequestHandler := api.NewPasswordRequestHandler(cfg)
	wsHub := api.NewWebSocketHub()
	go wsHub.Run()

	// Health check endpoint
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Auth routes (public)
	r.HandleFunc("/auth/login", authHandler.Login).Methods("POST")
	r.HandleFunc("/auth/logout", middleware.AuthMiddleware(authHandler.Logout)).Methods("POST")
	r.HandleFunc("/auth/me", middleware.AuthMiddleware(authHandler.Me)).Methods("GET")

	// User management routes (protected)
	r.HandleFunc("/auth/users", middleware.AuthMiddleware(authHandler.GetAllUsers)).Methods("GET")
	r.HandleFunc("/auth/users/permissions", middleware.AuthMiddleware(authHandler.UpdateUserPermissions)).Methods("PUT")

	// Stock routes (protected)
	r.HandleFunc("/stock/upload", middleware.AuthMiddleware(stockHandler.StartUpload(wsHub))).Methods("POST")
	r.HandleFunc("/stock/control/{runId}", middleware.AuthMiddleware(stockHandler.ControlRun)).Methods("POST")
	r.HandleFunc("/stock/download/{runId}/{filename}", middleware.AuthMiddleware(stockHandler.DownloadFile)).Methods("GET")

	// Config routes (protected)
	r.HandleFunc("/config/clients", middleware.AuthMiddleware(stockHandler.SaveClients)).Methods("POST")

	// Profile routes (protected)
	r.HandleFunc("/profile", middleware.AuthMiddleware(profileHandler.GetProfile)).Methods("GET")
	r.HandleFunc("/activity-log", middleware.AuthMiddleware(profileHandler.GetActivityLog)).Methods("GET")
	r.HandleFunc("/upload-history", middleware.AuthMiddleware(profileHandler.GetAllUploadHistory)).Methods("GET")

	// Password change request routes (protected)
	r.HandleFunc("/password-request", middleware.AuthMiddleware(passwordRequestHandler.CreateRequest)).Methods("POST")
	r.HandleFunc("/password-request/my-requests", middleware.AuthMiddleware(passwordRequestHandler.GetMyRequests)).Methods("GET")
	r.HandleFunc("/password-request/all", middleware.AuthMiddleware(passwordRequestHandler.GetAllRequests)).Methods("GET")
	r.HandleFunc("/password-request/review", middleware.AuthMiddleware(passwordRequestHandler.ReviewRequest)).Methods("POST")
	r.HandleFunc("/password-request/pending-count", middleware.AuthMiddleware(passwordRequestHandler.GetPendingCount)).Methods("GET")

	// WebSocket endpoint
	r.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		api.ServeWebSocket(wsHub, w, r)
	})

	// Serve static files
	r.PathPrefix("/storage").Handler(http.StripPrefix("/storage", http.FileServer(http.Dir("./storage"))))
	r.PathPrefix("/config").Handler(http.StripPrefix("/config", http.FileServer(http.Dir("./config"))))

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "5001"
	}

	fmt.Printf("🚀 Go Backend server starting on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
