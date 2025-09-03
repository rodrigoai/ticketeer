// Event management functionality
class EventManager {
    constructor() {
        this.events = [];
        this.currentEditingEvent = null;
        this.init();
    }

    async init() {
        // Wait for authentication to be ready
        await this.waitForAuth();
        
        // Initialize event handlers
        this.setupEventHandlers();
        
        // Load data
        await this.loadEvents();
        await this.loadEventStats();
    }

    async waitForAuth() {
        // Wait for the authentication system to be initialized
        return new Promise((resolve) => {
            const checkAuth = () => {
                if (window.ticketeerAuth && window.ticketeerAuth.initialized) {
                    resolve();
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            checkAuth();
        });
    }

    setupEventHandlers() {
        // Form submission
        document.getElementById('eventForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(e);
        });

        // File upload handlers
        this.setupFileUpload('promotionalUpload', 'promotionalImage', 'promotionalPreview');
        this.setupFileUpload('mapUpload', 'mapImage', 'mapPreview');

        // Modal events
        document.getElementById('eventModal').addEventListener('hidden.bs.modal', () => {
            this.resetForm();
        });

        // Confirmation modal
        document.getElementById('confirmButton').addEventListener('click', () => {
            this.confirmAction && this.confirmAction();
        });
    }

    setupFileUpload(uploadAreaId, inputId, previewId) {
        const uploadArea = document.getElementById(uploadAreaId);
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);

        // Click to upload
        uploadArea.addEventListener('click', () => input.click());

        // File selection
        input.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.previewImage(e.target.files[0], preview);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files[0] && files[0].type.startsWith('image/')) {
                input.files = files;
                this.previewImage(files[0], preview);
            }
        });
    }

    previewImage(file, preview) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    async loadEvents() {
        try {
            this.showLoading(true);
            
            const response = await this.apiCall('GET', '/api/events');
            
            if (response.success) {
                this.events = response.events;
                this.renderEvents();
            } else {
                this.showError('Failed to load events: ' + response.message);
            }
        } catch (error) {
            console.error('Error loading events:', error);
            this.showError('Failed to load events. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadEventStats() {
        try {
            const response = await this.apiCall('GET', '/api/stats');
            
            if (response.success) {
                document.getElementById('totalEvents').textContent = response.totalEvents;
                document.getElementById('activeEvents').textContent = response.activeEvents;
                document.getElementById('upcomingEvents').textContent = response.upcomingEvents;
                document.getElementById('pastEvents').textContent = response.pastEvents;
                
                document.getElementById('eventStats').style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    renderEvents() {
        const eventList = document.getElementById('eventList');
        const emptyState = document.getElementById('emptyState');
        
        if (this.events.length === 0) {
            eventList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        eventList.style.display = 'block';
        emptyState.style.display = 'none';
        
        eventList.innerHTML = this.events.map(event => this.renderEventCard(event)).join('');
    }

    renderEventCard(event) {
        const openingDate = new Date(event.opening_datetime);
        const closingDate = new Date(event.closing_datetime);
        const now = new Date();
        
        const isUpcoming = openingDate > now;
        const isPast = closingDate < now;
        const isActive = !isPast && event.status === 'active';
        
        const statusColor = event.status === 'active' ? 'success' : 
                           event.status === 'inactive' ? 'warning' : 'danger';
        
        const promotionalImage = event.promotional_image 
            ? `<img src="${event.promotional_image}" class="card-img-top event-image" alt="${event.name}">`
            : `<div class="card-img-top event-image"><i class="bi bi-image fs-1"></i></div>`;

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card event-card h-100">
                    <div class="position-relative">
                        ${promotionalImage}
                        <span class="badge bg-${statusColor} status-badge">${event.status}</span>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${this.escapeHtml(event.name)}</h5>
                        ${event.venue ? `<p class="text-muted mb-2"><i class="bi bi-geo-alt"></i> ${this.escapeHtml(event.venue)}</p>` : ''}
                        
                        <div class="mb-2">
                            <small class="text-muted">
                                <i class="bi bi-calendar-event"></i> 
                                ${openingDate.toLocaleDateString()} ${openingDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </small>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted">
                                <i class="bi bi-calendar-x"></i> 
                                ${closingDate.toLocaleDateString()} ${closingDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </small>
                        </div>
                        
                        ${event.description ? `<p class="card-text flex-grow-1">${this.escapeHtml(event.description).substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>` : ''}
                        
                        <div class="mt-auto">
                            <button class="btn btn-outline-primary btn-sm me-2" onclick="eventManager.editEvent(${event.id})">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="eventManager.confirmDelete(${event.id}, '${this.escapeHtml(event.name)}')">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async handleFormSubmit(e) {
        const submitButton = e.target.querySelector('button[type="submit"]');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');
        
        try {
            submitButton.disabled = true;
            submitSpinner.style.display = 'inline-block';
            
            const formData = new FormData(e.target);
            
            // Client-side validation
            const openingDate = new Date(formData.get('opening_datetime'));
            const closingDate = new Date(formData.get('closing_datetime'));
            
            if (openingDate >= closingDate) {
                this.showError('Opening date must be before closing date');
                return;
            }
            
            const method = this.currentEditingEvent ? 'PUT' : 'POST';
            const url = this.currentEditingEvent 
                ? `/api/events/${this.currentEditingEvent.id}` 
                : '/api/events';
            
            const response = await this.apiCall(method, url, formData);
            
            if (response.success) {
                this.showSuccess(response.message || 'Event saved successfully');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('eventModal'));
                modal.hide();
                
                // Reload events
                await this.loadEvents();
                await this.loadEventStats();
            } else {
                this.showError(response.message || 'Failed to save event');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            this.showError('Failed to save event. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitSpinner.style.display = 'none';
        }
    }

    editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        this.currentEditingEvent = event;
        
        // Populate form
        document.getElementById('eventName').value = event.name;
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventVenue').value = event.venue || '';
        document.getElementById('openingDatetime').value = this.formatDateTimeLocal(event.opening_datetime);
        document.getElementById('closingDatetime').value = this.formatDateTimeLocal(event.closing_datetime);
        document.getElementById('eventStatus').value = event.status;
        
        // Show status field for editing
        document.getElementById('statusField').style.display = 'block';
        
        // Update modal title
        document.getElementById('modalTitle').textContent = 'Edit Event';
        document.getElementById('submitText').textContent = 'Update Event';
        
        // Show existing images
        if (event.promotional_image) {
            document.getElementById('promotionalPreview').src = event.promotional_image;
            document.getElementById('promotionalPreview').style.display = 'block';
        }
        
        if (event.map_image) {
            document.getElementById('mapPreview').src = event.map_image;
            document.getElementById('mapPreview').style.display = 'block';
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('eventModal'));
        modal.show();
    }

    confirmDelete(eventId, eventName) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        document.getElementById('confirmMessage').innerHTML = 
            `Are you sure you want to delete the event <strong>"${this.escapeHtml(eventName)}"</strong>? This action cannot be undone.`;
        
        this.confirmAction = () => this.deleteEvent(eventId);
        
        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        modal.show();
    }

    async deleteEvent(eventId) {
        try {
            const response = await this.apiCall('DELETE', `/api/events/${eventId}`);
            
            if (response.success) {
                this.showSuccess('Event deleted successfully');
                
                // Close confirmation modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
                modal.hide();
                
                // Reload events
                await this.loadEvents();
                await this.loadEventStats();
            } else {
                this.showError(response.message || 'Failed to delete event');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            this.showError('Failed to delete event. Please try again.');
        }
    }

    resetForm() {
        this.currentEditingEvent = null;
        
        // Reset form
        document.getElementById('eventForm').reset();
        
        // Hide status field
        document.getElementById('statusField').style.display = 'none';
        
        // Reset modal title
        document.getElementById('modalTitle').textContent = 'New Event';
        document.getElementById('submitText').textContent = 'Create Event';
        
        // Hide image previews
        document.getElementById('promotionalPreview').style.display = 'none';
        document.getElementById('mapPreview').style.display = 'none';
    }

    async apiCall(method, url, data = null) {
        // For server-side auth, we don't need to send tokens
        // The browser automatically sends cookies with the request
        const options = {
            method,
            credentials: 'same-origin', // Include cookies for authentication
            headers: {}
        };
        
        if (data && !(data instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else if (data instanceof FormData) {
            options.body = data;
        }
        
        const response = await fetch(url, options);
        return await response.json();
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.style.display = 'block';
        } else {
            spinner.style.display = 'none';
        }
    }

    showSuccess(message) {
        // Create a toast notification or use browser alert for now
        alert('✅ ' + message);
    }

    showError(message) {
        // Create a toast notification or use browser alert for now
        alert('❌ ' + message);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDateTimeLocal(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
}

// Initialize the event manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.eventManager = new EventManager();
});
