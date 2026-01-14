<template>
  <div class="container py-5">
    <!-- Loading State -->
    <div v-if="isLoadingEvent" class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading event...</span>
      </div>
    </div>

    <!-- Event Not Found -->
    <div v-else-if="!event" class="text-center py-5">
      <div class="mb-4">
        <span class="display-1">❌</span>
      </div>
      <h4>Event Not Found</h4>
      <p class="text-muted">The event you're looking for doesn't exist or you don't have access to it.</p>
      <router-link to="/events" class="btn btn-primary">Back to Events</router-link>
    </div>

    <!-- Event Detail -->
    <div v-else>
      <!-- Event Header -->
      <div class="row mb-4">
        <div class="col-12">
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <router-link to="/events">Events</router-link>
              </li>
              <li class="breadcrumb-item active">{{ event.title }}</li>
            </ol>
          </nav>
          
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h1>{{ event.title }}</h1>
              <p class="text-muted mb-2" v-if="event.description">{{ event.description }}</p>
              <div class="d-flex gap-3 text-muted">
                <span><i class="fas fa-calendar"></i> {{ formatDate(event.date) }}</span>
                <span v-if="event.venue"><i class="fas fa-map-marker-alt"></i> {{ event.venue }}</span>
              </div>
            </div>
            <div class="text-end">
              <router-link :to="`/events`" class="btn btn-outline-secondary me-2">
                <i class="fas fa-arrow-left"></i> Back
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Ticket Statistics -->
      <div class="row mb-4" v-if="stats">
        <div class="col-12">
          <div class="row">
            <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
              <div class="card bg-primary text-white">
                <div class="card-body text-center">
                  <h5 class="card-title">{{ stats.totalTickets }}</h5>
                  <p class="card-text mb-0">Total Tickets</p>
                </div>
              </div>
            </div>
            <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
              <div class="card bg-success text-white">
                <div class="card-body text-center">
                  <h5 class="card-title">{{ stats.totalSold || 0 }}</h5>
                  <p class="card-text mb-0">Total Sold</p>
                </div>
              </div>
            </div>
            <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
              <div class="card bg-secondary text-white">
                <div class="card-body text-center">
                  <h5 class="card-title">{{ stats.totalRemaining || 0 }}</h5>
                  <p class="card-text mb-0">Total Remaining</p>
                </div>
              </div>
            </div>
            <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
              <div class="card bg-info text-white">
                <div class="card-body text-center">
                  <h5 class="card-title">{{ stats.totalConfirmed || 0 }}</h5>
                  <p class="card-text mb-0">Total Confirmed</p>
                </div>
              </div>
            </div>
            <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
              <div class="card bg-warning text-white">
                <div class="card-body text-center">
                  <h5 class="card-title">{{ stats.checkedInTickets || 0 }}</h5>
                  <p class="card-text mb-0">Checked-In</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ticket Management -->
      <div class="row">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Tickets</h3>
            <div>
              <button class="btn btn-success me-2" @click="showCreateModal">
                <i class="fas fa-plus"></i> Add Ticket
              </button>
              <button class="btn btn-info" @click="showBatchCreateModal">
                <i class="fas fa-layer-group"></i> Batch Create
              </button>
            </div>
          </div>

          <!-- Bulk Actions Toolbar -->
          <div v-if="selectedTicketIds.length > 0" class="alert alert-info d-flex justify-content-between align-items-center mb-3">
            <span>
              <strong>{{ selectedTicketIds.length }}</strong> ticket(s) selected
            </span>
            <div>
              <button class="btn btn-sm btn-primary me-2" @click="showBulkEditModal">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn btn-sm btn-danger me-2" @click="confirmBulkDelete">
                <i class="fas fa-trash"></i> Delete
              </button>
              <button class="btn btn-sm btn-secondary" @click="clearSelection">
                <i class="fas fa-times"></i> Clear
              </button>
            </div>
          </div>

          <!-- Tickets Loading -->
          <div v-if="isLoadingTickets" class="text-center">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Loading tickets...</span>
            </div>
          </div>

          <!-- No Tickets -->
          <div v-else-if="tickets.length === 0" class="text-center py-5">
            <div class="mb-4">
              <span class="display-1">🎟️</span>
            </div>
            <h4>No Tickets Yet</h4>
            <p class="text-muted">Create your first ticket for this event!</p>
            <button class="btn btn-success me-2" @click="showCreateModal">Create Ticket</button>
            <button class="btn btn-info" @click="showBatchCreateModal">Batch Create</button>
          </div>

          <!-- Tickets DataTable -->
          <div v-else>
            <!-- Search Filter -->
            <div class="mb-3">
              <div class="input-group">
                <span class="input-group-text">
                  <i class="fas fa-search"></i>
                </span>
                <input 
                  type="text" 
                  class="form-control" 
                  placeholder="Search tickets by description, location, buyer, email, or order..."
                  v-model="searchValue"
                >
                <button 
                  v-if="searchValue" 
                  class="btn btn-outline-secondary" 
                  @click="searchValue = ''"
                  title="Clear search"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>

            <EasyDataTable
              :headers="headers"
              :items="tickets"
              :rows-per-page="500"
              :search-value="searchValue"
              table-class-name="customize-table"
              header-text-direction="left"
              body-text-direction="left"
              border-cell
              alternating
            >
              <!-- Select Checkbox Column -->
              <template #item-select="item">
                <div class="text-center">
                  <input 
                    type="checkbox" 
                    class="form-check-input" 
                    :checked="selectedTicketIds.includes(item.id)"
                    @change="toggleTicketSelection(item.id)"
                  >
                </div>
              </template>

              <!-- Status Icon Column -->
              <template #item-statusIcon="{ checkedIn }">
                <div class="text-center">
                  <span v-if="checkedIn" class="text-success" title="Checked In">
                    <i class="fas fa-check-circle fa-lg"></i>
                  </span>
                  <span v-else class="text-muted" title="Not Checked In">
                    <i class="far fa-circle fa-lg"></i>
                  </span>
                </div>
              </template>

              <!-- Accessory Status Icon Column -->
              <template #item-accessoryIcon="{ accessoryCollected }">
                <div class="text-center">
                  <span v-if="accessoryCollected" class="text-primary" title="Kit Picked Up">
                    <i class="fas fa-box fa-lg"></i>
                  </span>
                  <span v-else class="text-muted" title="Kit Not Picked Up">
                    <i class="fas fa-box fa-lg" style="opacity: 0.3"></i>
                  </span>
                </div>
              </template>

              <!-- Identification Number -->
              <template #item-identificationNumber="{ identificationNumber }">
                <strong>{{ identificationNumber }}</strong>
              </template>

              <!-- Description + Location Column -->
              <template #item-descriptionLocation="item">
                <div>
                  <div>{{ item.description }}</div>
                  <small class="text-muted" v-if="item.location">{{ item.location }}</small>
                </div>
              </template>

              <!-- Table -->
              <template #item-table="{ table }">
                {{ table || '-' }}
              </template>

              <!-- Order Column (Clickable Badge) -->
              <template #item-order="item">
                <a 
                  v-if="item.order"
                  :href="getCachedConfirmationUrl(item.order)" 
                  target="_blank" 
                  class="badge bg-info text-dark text-decoration-none order-link"
                  title="Open confirmation page"
                >
                  {{ item.order }}
                </a>
                <span v-else class="text-muted">-</span>
              </template>

              <!-- Buyer -->
              <template #item-buyer="{ buyer }">
                {{ buyer || '-' }}
              </template>

              <!-- Buyer Email -->
              <template #item-buyerEmail="{ buyerEmail }">
                {{ buyerEmail || '-' }}
              </template>

              <!-- Sales End Date -->
              <template #item-salesEndDateTime="{ salesEndDateTime }">
                {{ salesEndDateTime ? formatDate(salesEndDateTime) : '-' }}
              </template>

              <!-- Actions Column -->
              <template #item-actions="item">
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary" @click="editTicket(item)" title="Edit">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button 
                    v-if="item.buyer && item.buyerEmail" 
                    class="btn btn-outline-info" 
                    @click="resendEmail(item)" 
                    title="Resend email with QR code"
                    :disabled="isResending"
                  >
                    <i class="fas fa-envelope"></i>
                  </button>
                  <button class="btn btn-outline-danger" @click="deleteTicket(item.id)" title="Delete">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </template>
            </EasyDataTable>
          </div>
        </div>
      </div>

      <!-- Error Messages -->
      <div v-if="error" class="alert alert-danger mt-3" role="alert">
        <strong>Error:</strong> {{ error }}
        <button class="btn btn-sm btn-outline-danger ms-2" @click="loadTickets">Retry</button>
      </div>
    </div>

    <!-- Create/Edit Ticket Modal -->
    <div class="modal fade" id="ticketModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditingTicket ? 'Edit Ticket' : 'Create Ticket' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveTicket">
              <div class="mb-3">
                <label for="ticketDescription" class="form-label">Description *</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="ticketDescription" 
                  v-model="ticketForm.description" 
                  required
                >
              </div>
              <div class="mb-3">
                <label for="ticketPrice" class="form-label">Price *</label>
                <div class="input-group">
                  <span class="input-group-text">$</span>
                  <input 
                    type="number" 
                    class="form-control" 
                    id="ticketPrice" 
                    v-model="ticketForm.price" 
                    step="0.01" 
                    min="0"
                    required
                  >
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="ticketLocation" class="form-label">Location</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      id="ticketLocation" 
                      v-model="ticketForm.location"
                    >
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="ticketTable" class="form-label">Table</label>
                    <input 
                      type="number" 
                      class="form-control" 
                      id="ticketTable" 
                      v-model="ticketForm.table" 
                      min="1"
                    >
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label for="ticketBuyer" class="form-label">Buyer</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="ticketBuyer" 
                  v-model="ticketForm.buyer"
                >
              </div>
              <div class="mb-3">
                <label for="ticketBuyerDocument" class="form-label">Buyer Document</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="ticketBuyerDocument" 
                  v-model="ticketForm.buyerDocument"
                >
              </div>
              <div class="mb-3">
                <label for="ticketBuyerEmail" class="form-label">Buyer Email</label>
                <input 
                  type="email" 
                  class="form-control" 
                  id="ticketBuyerEmail" 
                  v-model="ticketForm.buyerEmail"
                >
              </div>
              <div class="mb-3">
                <label for="ticketOrder" class="form-label">Order</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="ticketOrder" 
                  v-model="ticketForm.order"
                >
              </div>
              <div class="mb-3">
                <label for="ticketSalesEndDateTime" class="form-label">Sales End Date & Time</label>
                <input 
                  type="datetime-local" 
                  class="form-control" 
                  id="ticketSalesEndDateTime" 
                  v-model="ticketForm.salesEndDateTime"
                >
                <div class="form-text">Optional: Set when ticket sales should end</div>
              </div>
              
              <!-- Check-in Status Section -->
              <div class="mb-3" v-if="isEditingTicket">
                <hr class="my-3">
                <h6 class="mb-3">Check-in Status</h6>
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-check mb-3">
                      <input 
                        type="checkbox" 
                        class="form-check-input" 
                        id="ticketCheckedIn" 
                        v-model="ticketForm.checkedIn"
                        @change="onCheckedInChange"
                      >
                      <label class="form-check-label" for="ticketCheckedIn">
                        <strong>Checked In</strong>
                        <span v-if="ticketForm.checkedIn" class="text-success ms-2">
                          <i class="fas fa-check-circle"></i>
                        </span>
                      </label>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="ticketCheckedInAt" class="form-label">Checked In At</label>
                      <input 
                        type="datetime-local" 
                        class="form-control" 
                        id="ticketCheckedInAt" 
                        v-model="ticketForm.checkedInAt"
                        :disabled="!ticketForm.checkedIn"
                      >
                    </div>
                  </div>
                </div>

                <!-- Accessory Pickup Status -->
                <hr class="my-3">
                <h6 class="mb-3">Accessory Pickup (Kit)</h6>
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-check mb-3">
                      <input 
                        type="checkbox" 
                        class="form-check-input" 
                        id="ticketAccessoryCollected" 
                        v-model="ticketForm.accessoryCollected"
                        @change="onAccessoryCollectedChange"
                      >
                      <label class="form-check-label" for="ticketAccessoryCollected">
                        <strong>Kit Picked Up</strong>
                        <span v-if="ticketForm.accessoryCollected" class="text-primary ms-2">
                          <i class="fas fa-box"></i>
                        </span>
                      </label>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="ticketAccessoryCollectedAt" class="form-label">Picked Up At</label>
                      <input 
                        type="datetime-local" 
                        class="form-control" 
                        id="ticketAccessoryCollectedAt" 
                        v-model="ticketForm.accessoryCollectedAt"
                        :disabled="!ticketForm.accessoryCollected"
                      >
                    </div>
                  </div>
                </div>
                <div class="mb-3">
                  <label for="ticketAccessoryCollectedNotes" class="form-label">Pickup Notes</label>
                  <textarea 
                    class="form-control" 
                    id="ticketAccessoryCollectedNotes" 
                    v-model="ticketForm.accessoryCollectedNotes" 
                    rows="2"
                    placeholder="Enter any observations about the kit pickup..."
                  ></textarea>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="saveTicket" :disabled="isLoading">
              {{ isLoading ? 'Saving...' : 'Save Ticket' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Batch Create Modal -->
    <div class="modal fade" id="batchModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Batch Create Tickets</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveBatchTickets">
              <div class="mb-3">
                <label for="batchDescription" class="form-label">Description *</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="batchDescription" 
                  v-model="batchForm.description" 
                  required
                >
              </div>
              <div class="mb-3">
                <label for="batchPrice" class="form-label">Price *</label>
                <div class="input-group">
                  <span class="input-group-text">$</span>
                  <input 
                    type="number" 
                    class="form-control" 
                    id="batchPrice" 
                    v-model="batchForm.price" 
                    step="0.01" 
                    min="0"
                    required
                  >
                </div>
              </div>
              <div class="mb-3">
                <label for="batchQuantity" class="form-label">Quantity *</label>
                <input 
                  type="number" 
                  class="form-control" 
                  id="batchQuantity" 
                  v-model="batchForm.quantity" 
                  min="1" 
                  max="100"
                  required
                >
                <div class="form-text">Create between 1 and 100 tickets at once</div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="batchLocation" class="form-label">Location</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      id="batchLocation" 
                      v-model="batchForm.location"
                    >
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="batchTable" class="form-label">Table</label>
                    <input 
                      type="number" 
                      class="form-control" 
                      id="batchTable" 
                      v-model="batchForm.table" 
                      min="1"
                    >
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label for="batchBuyer" class="form-label">Buyer</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="batchBuyer" 
                  v-model="batchForm.buyer"
                >
              </div>
              <div class="mb-3">
                <label for="batchBuyerDocument" class="form-label">Buyer Document</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="batchBuyerDocument" 
                  v-model="batchForm.buyerDocument"
                >
              </div>
              <div class="mb-3">
                <label for="batchBuyerEmail" class="form-label">Buyer Email</label>
                <input 
                  type="email" 
                  class="form-control" 
                  id="batchBuyerEmail" 
                  v-model="batchForm.buyerEmail"
                >
              </div>
              <div class="mb-3">
                <label for="batchOrder" class="form-label">Order</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="batchOrder" 
                  v-model="batchForm.order"
                >
              </div>
              <div class="mb-3">
                <label for="batchSalesEndDateTime" class="form-label">Sales End Date & Time</label>
                <input 
                  type="datetime-local" 
                  class="form-control" 
                  id="batchSalesEndDateTime" 
                  v-model="batchForm.salesEndDateTime"
                >
                <div class="form-text">Optional: Set when ticket sales should end (applies to all tickets)</div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-info" @click="saveBatchTickets" :disabled="isLoading">
              {{ isLoading ? 'Creating...' : `Create ${batchForm.quantity || 0} Tickets` }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Edit Modal -->
    <div class="modal fade" id="bulkEditModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Bulk Edit {{ selectedTicketIds.length }} Ticket(s)</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="fas fa-info-circle"></i> Fill in fields to update them, or check "Clear" to set them as empty.
            </div>
            <form @submit.prevent="saveBulkEdit">
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="bulkLocation" class="form-label">Location</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      id="bulkLocation" 
                      v-model="bulkEditForm.location"
                      :disabled="bulkEditForm.clearLocation"
                      placeholder="Leave empty to skip"
                    >
                    <div class="form-check mt-2">
                      <input 
                        type="checkbox" 
                        class="form-check-input" 
                        id="clearLocation" 
                        v-model="bulkEditForm.clearLocation"
                      >
                      <label class="form-check-label text-muted" for="clearLocation">
                        <small>Clear this field</small>
                      </label>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="bulkTable" class="form-label">Table</label>
                    <input 
                      type="number" 
                      class="form-control" 
                      id="bulkTable" 
                      v-model="bulkEditForm.table" 
                      min="1"
                      :disabled="bulkEditForm.clearTable"
                      placeholder="Leave empty to skip"
                    >
                    <div class="form-check mt-2">
                      <input 
                        type="checkbox" 
                        class="form-check-input" 
                        id="clearTable" 
                        v-model="bulkEditForm.clearTable"
                      >
                      <label class="form-check-label text-muted" for="clearTable">
                        <small>Clear this field</small>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label for="bulkOrder" class="form-label">Order</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="bulkOrder" 
                  v-model="bulkEditForm.order"
                  :disabled="bulkEditForm.clearOrder"
                  placeholder="Leave empty to skip"
                >
                <div class="form-check mt-2">
                  <input 
                    type="checkbox" 
                    class="form-check-input" 
                    id="clearOrder" 
                    v-model="bulkEditForm.clearOrder"
                  >
                  <label class="form-check-label text-muted" for="clearOrder">
                    <small>Clear this field</small>
                  </label>
                </div>
              </div>
              <div class="mb-3">
                <label for="bulkBuyer" class="form-label">Buyer</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="bulkBuyer" 
                  v-model="bulkEditForm.buyer"
                  :disabled="bulkEditForm.clearBuyer"
                  placeholder="Leave empty to skip"
                >
                <div class="form-check mt-2">
                  <input 
                    type="checkbox" 
                    class="form-check-input" 
                    id="clearBuyer" 
                    v-model="bulkEditForm.clearBuyer"
                  >
                  <label class="form-check-label text-muted" for="clearBuyer">
                    <small>Clear this field</small>
                  </label>
                </div>
              </div>
              <div class="mb-3">
                <label for="bulkBuyerDocument" class="form-label">Buyer Document</label>
                <input 
                  type="text" 
                  class="form-control" 
                  id="bulkBuyerDocument" 
                  v-model="bulkEditForm.buyerDocument"
                  :disabled="bulkEditForm.clearBuyerDocument"
                  placeholder="Leave empty to skip"
                >
                <div class="form-check mt-2">
                  <input 
                    type="checkbox" 
                    class="form-check-input" 
                    id="clearBuyerDocument" 
                    v-model="bulkEditForm.clearBuyerDocument"
                  >
                  <label class="form-check-label text-muted" for="clearBuyerDocument">
                    <small>Clear this field</small>
                  </label>
                </div>
              </div>
              <div class="mb-3">
                <label for="bulkBuyerEmail" class="form-label">Buyer Email</label>
                <input 
                  type="email" 
                  class="form-control" 
                  id="bulkBuyerEmail" 
                  v-model="bulkEditForm.buyerEmail"
                  :disabled="bulkEditForm.clearBuyerEmail"
                  placeholder="Leave empty to skip"
                >
                <div class="form-check mt-2">
                  <input 
                    type="checkbox" 
                    class="form-check-input" 
                    id="clearBuyerEmail" 
                    v-model="bulkEditForm.clearBuyerEmail"
                  >
                  <label class="form-check-label text-muted" for="clearBuyerEmail">
                    <small>Clear this field</small>
                  </label>
                </div>
              </div>
              <hr class="my-3">
              <h6 class="mb-3">Check-in Status</h6>
              <div class="mb-3">
                <div class="form-check">
                  <input 
                    type="checkbox" 
                    class="form-check-input" 
                    id="bulkCheckedIn" 
                    v-model="bulkEditForm.checkedIn"
                  >
                  <label class="form-check-label" for="bulkCheckedIn">
                    Mark as Checked In
                  </label>
                </div>
              </div>
              <div class="mb-3" v-if="bulkEditForm.checkedIn">
                <label for="bulkCheckedInAt" class="form-label">Checked In At</label>
                <input 
                  type="datetime-local" 
                  class="form-control" 
                  id="bulkCheckedInAt" 
                  v-model="bulkEditForm.checkedInAt"
                >
                <div class="form-text">Leave empty to use current date/time</div>
              </div>
              <hr class="my-3">
              <h6 class="mb-3">Accessory Pickup Status (Kit)</h6>
              <div class="mb-3">
                <div class="form-check">
                  <input 
                    type="checkbox" 
                    class="form-check-input" 
                    id="bulkAccessoryCollected" 
                    v-model="bulkEditForm.accessoryCollected"
                  >
                  <label class="form-check-label" for="bulkAccessoryCollected">
                    Mark as Kit Picked Up
                  </label>
                </div>
              </div>
              <div class="mb-3" v-if="bulkEditForm.accessoryCollected">
                <label for="bulkAccessoryCollectedAt" class="form-label">Picked Up At</label>
                <input 
                  type="datetime-local" 
                  class="form-control" 
                  id="bulkAccessoryCollectedAt" 
                  v-model="bulkEditForm.accessoryCollectedAt"
                >
                <div class="form-text">Leave empty to use current date/time</div>
              </div>
              <div class="mb-3">
                <label for="bulkAccessoryCollectedNotes" class="form-label">Pickup Notes</label>
                <textarea 
                  class="form-control" 
                  id="bulkAccessoryCollectedNotes" 
                  v-model="bulkEditForm.accessoryCollectedNotes" 
                  rows="2"
                  placeholder="Leave empty to skip"
                ></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="saveBulkEdit" :disabled="isLoading">
              {{ isLoading ? 'Updating...' : `Update ${selectedTicketIds.length} Ticket(s)` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useUser } from '@/composables/useUser'
import { Modal } from 'bootstrap'
import EasyDataTable from 'vue3-easy-data-table'
import 'vue3-easy-data-table/dist/style.css'

// Props and route
const route = useRoute()
const eventId = computed(() => route.params.id)

// Composables
const { isLoading, error, get, post, put, delete: deleteApi } = useApi()
const { isAuthenticated } = useUser()

// Data
const event = ref(null)
const tickets = ref([])
const stats = ref(null)
const isLoadingEvent = ref(false)
const isLoadingTickets = ref(false)
const isEditingTicket = ref(false)
const currentTicketId = ref(null)
const isResending = ref(false)
const searchValue = ref('')
const selectedTicketIds = ref([])

// Forms
const ticketForm = reactive({
  description: '',
  location: '',
  table: null,
  price: 0,
  buyer: '',
  buyerDocument: '',
  buyerEmail: '',
  order: '',
  salesEndDateTime: '',
  checkedIn: false,
  checkedInAt: '',
  accessoryCollected: false,
  accessoryCollectedAt: '',
  accessoryCollectedNotes: ''
})

const batchForm = reactive({
  description: '',
  location: '',
  table: null,
  price: 0,
  quantity: 1,
  buyer: '',
  buyerDocument: '',
  buyerEmail: '',
  order: '',
  salesEndDateTime: ''
})

const bulkEditForm = reactive({
  location: '',
  table: '',
  order: '',
  buyer: '',
  buyerDocument: '',
  buyerEmail: '',
  checkedIn: false,
  checkedInAt: '',
  accessoryCollected: false,
  accessoryCollectedAt: '',
  accessoryCollectedNotes: '',
  clearLocation: false,
  clearTable: false,
  clearOrder: false,
  clearBuyer: false,
  clearBuyerDocument: false,
  clearBuyerEmail: false
})

// DataTable headers configuration
const headers = [
  { text: '', value: 'select', sortable: false, width: 50 },
  { text: 'Status', value: 'statusIcon', sortable: false, width: 80 },
  { text: 'Kit', value: 'accessoryIcon', sortable: false, width: 80 },
  { text: '#', value: 'identificationNumber', sortable: true, width: 80 },
  { text: 'Description', value: 'descriptionLocation', sortable: true },
  { text: 'Table', value: 'table', sortable: true, width: 100 },
  { text: 'Order', value: 'order', sortable: true, width: 120 },
  { text: 'Buyer', value: 'buyer', sortable: true },
  { text: 'Email', value: 'buyerEmail', sortable: true },
  { text: 'Sales End', value: 'salesEndDateTime', sortable: true, width: 150 },
  { text: 'Actions', value: 'actions', sortable: false, width: 150 }
]

// Bootstrap modals
let ticketModal = null
let batchModal = null
let bulkEditModal = null
let bulkDeleteModal = null

// Load event data
const loadEvent = async () => {
  try {
    isLoadingEvent.value = true
    const data = await get(`/api/events/${eventId.value}`)
    
    if (data.success && data.event) {
      event.value = data.event
    } else {
      event.value = null
    }
  } catch (err) {
    console.error('Failed to load event:', err)
    event.value = null
  } finally {
    isLoadingEvent.value = false
  }
}

// Load tickets
const loadTickets = async () => {
  try {
    isLoadingTickets.value = true
    const data = await get(`/api/events/${eventId.value}/tickets`)
    
    tickets.value = data.tickets || []
    error.value = null
    
    // Preload confirmation URLs for all orders in background
    if (tickets.value.length > 0) {
      preloadConfirmationUrls().catch(err => {
        console.debug('Some confirmation URLs could not be preloaded:', err)
      })
    }
  } catch (err) {
    console.error('Failed to load tickets:', err)
    tickets.value = []
    error.value = err.message || 'Failed to load tickets'
  } finally {
    isLoadingTickets.value = false
  }
}

// Load statistics
const loadStats = async () => {
  try {
    const data = await get(`/api/events/${eventId.value}/tickets/stats`)
    stats.value = data.stats || null
  } catch (err) {
    console.error('Failed to load stats:', err)
    stats.value = null
  }
}

// Show create modal
const showCreateModal = () => {
  isEditingTicket.value = false
  currentTicketId.value = null
  resetTicketForm()
  
  if (!ticketModal) {
    ticketModal = new Modal(document.getElementById('ticketModal'))
  }
  ticketModal.show()
}

// Show batch create modal
const showBatchCreateModal = () => {
  resetBatchForm()
  
  if (!batchModal) {
    batchModal = new Modal(document.getElementById('batchModal'))
  }
  batchModal.show()
}

// Edit ticket
const editTicket = (ticket) => {
  isEditingTicket.value = true
  currentTicketId.value = ticket.id
  
  // Populate form
  Object.assign(ticketForm, {
    description: ticket.description || '',
    location: ticket.location || '',
    table: ticket.table || null,
    price: ticket.price || 0,
    buyer: ticket.buyer || '',
    buyerDocument: ticket.buyerDocument || '',
    buyerEmail: ticket.buyerEmail || '',
    order: ticket.order || '',
    salesEndDateTime: ticket.salesEndDateTime ? new Date(ticket.salesEndDateTime).toISOString().slice(0, 16) : '',
    checkedIn: ticket.checkedIn || false,
    checkedInAt: ticket.checkedInAt ? new Date(ticket.checkedInAt).toISOString().slice(0, 16) : '',
    accessoryCollected: ticket.accessoryCollected || false,
    accessoryCollectedAt: ticket.accessoryCollectedAt ? new Date(ticket.accessoryCollectedAt).toISOString().slice(0, 16) : '',
    accessoryCollectedNotes: ticket.accessoryCollectedNotes || ''
  })
  
  if (!ticketModal) {
    ticketModal = new Modal(document.getElementById('ticketModal'))
  }
  ticketModal.show()
}

// Save ticket
const saveTicket = async () => {
  if (!ticketForm.description || !ticketForm.price) {
    error.value = 'Description and price are required'
    return
  }
  
  try {
    let result
    if (isEditingTicket.value) {
      result = await put(`/api/tickets/${currentTicketId.value}`, ticketForm)
    } else {
      result = await post(`/api/events/${eventId.value}/tickets`, ticketForm)
    }
    
    console.log('Ticket saved:', result)
    
    // Close modal and reload
    if (ticketModal) ticketModal.hide()
    resetTicketForm()
    await loadTickets()
    await loadStats()
    
    error.value = null
  } catch (err) {
    console.error('Failed to save ticket:', err)
    error.value = err.message || 'Failed to save ticket'
  }
}

// Save batch tickets
const saveBatchTickets = async () => {
  if (!batchForm.description || !batchForm.price || !batchForm.quantity) {
    error.value = 'Description, price, and quantity are required'
    return
  }
  
  try {
    const result = await post(`/api/events/${eventId.value}/tickets/batch`, batchForm)
    console.log('Batch tickets created:', result)
    
    // Close modal and reload
    if (batchModal) batchModal.hide()
    resetBatchForm()
    await loadTickets()
    await loadStats()
    
    error.value = null
  } catch (err) {
    console.error('Failed to create batch tickets:', err)
    error.value = err.message || 'Failed to create tickets'
  }
}

// Resend email for a ticket
const resendEmail = async (ticket) => {
  if (!ticket.buyerEmail) {
    error.value = 'Ticket does not have a buyer email'
    return
  }
  
  if (!confirm(`Resend email to ${ticket.buyerEmail}?`)) {
    return
  }
  
  try {
    isResending.value = true
    const result = await post(`/api/tickets/${ticket.id}/resend-email`, {})
    
    if (result.success) {
      alert(`Email successfully sent to ${ticket.buyerEmail}!`)
    }
    
    error.value = null
  } catch (err) {
    console.error('Failed to resend email:', err)
    error.value = err.message || 'Failed to resend email'
    alert(`Failed to resend email: ${err.message}`)
  } finally {
    isResending.value = false
  }
}

// Delete ticket
const deleteTicket = async (ticketId) => {
  if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
    return
  }
  
  try {
    await deleteApi(`/api/tickets/${ticketId}`)
    await loadTickets()
    await loadStats()
    error.value = null
  } catch (err) {
    console.error('Failed to delete ticket:', err)
    error.value = err.message || 'Failed to delete ticket'
  }
}

// Reset forms
const resetTicketForm = () => {
  Object.assign(ticketForm, {
    description: '',
    location: '',
    table: null,
    price: 0,
    buyer: '',
    buyerDocument: '',
    buyerEmail: '',
    order: '',
    salesEndDateTime: '',
    checkedIn: false,
    checkedInAt: '',
    accessoryCollected: false,
    accessoryCollectedAt: '',
    accessoryCollectedNotes: ''
  })
}

const resetBatchForm = () => {
  Object.assign(batchForm, {
    description: '',
    location: '',
    table: null,
    price: 0,
    quantity: 1,
    buyer: '',
    buyerDocument: '',
    buyerEmail: '',
    order: '',
    salesEndDateTime: ''
  })
}

// Handle check-in status change
const onCheckedInChange = () => {
  if (ticketForm.checkedIn && !ticketForm.checkedInAt) {
    // If checking in and no date set, set current date/time
    ticketForm.checkedInAt = new Date().toISOString().slice(0, 16)
  } else if (!ticketForm.checkedIn) {
    // If unchecking, clear the check-in date
    ticketForm.checkedInAt = ''
  }
}

// Handle accessory pickup status change
const onAccessoryCollectedChange = () => {
  if (ticketForm.accessoryCollected && !ticketForm.accessoryCollectedAt) {
    // If marking as collected and no date set, set current date/time
    ticketForm.accessoryCollectedAt = new Date().toISOString().slice(0, 16)
  } else if (!ticketForm.accessoryCollected) {
    // If unmarking, clear the pickup date
    ticketForm.accessoryCollectedAt = ''
  }
}

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'No date'
  return new Date(dateString).toLocaleString()
}

// Store for cached confirmation URLs to avoid repeated API calls
const confirmationUrlCache = ref({})
const pendingUrls = new Set() // Track URLs being generated to prevent duplicate requests

// Generate confirmation URL synchronously without API calls
const getConfirmationUrl = (orderId) => {
  if (!orderId) return '#'
  
  // Check cache first
  if (confirmationUrlCache.value[orderId]) {
    return confirmationUrlCache.value[orderId]
  }
  
  // Return a simple base64 encoded URL (no API call needed for display)
  const baseUrl = window.location.origin
  const encodedId = btoa(orderId).replace(/[+/=]/g, '')
  return `${baseUrl}/confirmation/${encodedId}`
}

// Preload confirmation URLs for all orders in the tickets list
const preloadConfirmationUrls = async () => {
  // Get unique order IDs from tickets
  const orderIds = [...new Set(tickets.value.map(t => t.order).filter(Boolean))]
  
  // Only fetch URLs that aren't cached and aren't already being fetched
  const uncachedOrders = orderIds.filter(orderId => 
    !confirmationUrlCache.value[orderId] && !pendingUrls.has(orderId)
  )
  
  if (uncachedOrders.length === 0) return
  
  // Mark these orders as pending
  uncachedOrders.forEach(orderId => pendingUrls.add(orderId))
  
  // Fetch all hashes in parallel with error handling per order
  await Promise.allSettled(
    uncachedOrders.map(async (orderId) => {
      try {
        const response = await get(`/api/orders/${orderId}/confirmation-hash`)
        const baseUrl = window.location.origin
        confirmationUrlCache.value[orderId] = `${baseUrl}/confirmation/${response.hash}`
      } catch (error) {
        // Silently use fallback URL on error
        const baseUrl = window.location.origin
        const encodedId = btoa(orderId).replace(/[+/=]/g, '')
        confirmationUrlCache.value[orderId] = `${baseUrl}/confirmation/${encodedId}`
      } finally {
        pendingUrls.delete(orderId)
      }
    })
  )
}

// Get cached or computed confirmation URL for display
const getCachedConfirmationUrl = (orderId) => {
  if (!orderId) return '#'
  return getConfirmationUrl(orderId)
}

// Toggle ticket selection
const toggleTicketSelection = (ticketId) => {
  const index = selectedTicketIds.value.indexOf(ticketId)
  if (index > -1) {
    selectedTicketIds.value.splice(index, 1)
  } else {
    selectedTicketIds.value.push(ticketId)
  }
}

// Clear selection
const clearSelection = () => {
  selectedTicketIds.value = []
}

// Show bulk edit modal
const showBulkEditModal = () => {
  resetBulkEditForm()
  
  if (!bulkEditModal) {
    bulkEditModal = new Modal(document.getElementById('bulkEditModal'))
  }
  bulkEditModal.show()
}

// Save bulk edit
const saveBulkEdit = async () => {
  try {
    // Build updates object with only filled fields or cleared fields
    const updates = {}
    
    // Handle location
    if (bulkEditForm.clearLocation) {
      updates.location = null
    } else if (bulkEditForm.location) {
      updates.location = bulkEditForm.location
    }
    
    // Handle table
    if (bulkEditForm.clearTable) {
      updates.table = null
    } else if (bulkEditForm.table) {
      updates.table = parseInt(bulkEditForm.table)
    }
    
    // Handle order
    if (bulkEditForm.clearOrder) {
      updates.order = null
    } else if (bulkEditForm.order) {
      updates.order = bulkEditForm.order
    }
    
    // Handle buyer
    if (bulkEditForm.clearBuyer) {
      updates.buyer = null
    } else if (bulkEditForm.buyer) {
      updates.buyer = bulkEditForm.buyer
    }
    
    // Handle buyerDocument
    if (bulkEditForm.clearBuyerDocument) {
      updates.buyerDocument = null
    } else if (bulkEditForm.buyerDocument) {
      updates.buyerDocument = bulkEditForm.buyerDocument
    }
    
    // Handle buyerEmail
    if (bulkEditForm.clearBuyerEmail) {
      updates.buyerEmail = null
    } else if (bulkEditForm.buyerEmail) {
      updates.buyerEmail = bulkEditForm.buyerEmail
    }
    
    // Handle checkedIn
    if (bulkEditForm.checkedIn !== undefined) {
      updates.checkedIn = bulkEditForm.checkedIn
    }
    
    // Handle checkedInAt
    if (bulkEditForm.checkedInAt) {
      updates.checkedInAt = bulkEditForm.checkedInAt
    }
    
    // Handle accessoryCollected
    if (bulkEditForm.accessoryCollected !== undefined) {
      updates.accessoryCollected = bulkEditForm.accessoryCollected
    }
    
    // Handle accessoryCollectedAt
    if (bulkEditForm.accessoryCollectedAt) {
      updates.accessoryCollectedAt = bulkEditForm.accessoryCollectedAt
    }

    // Handle accessoryCollectedNotes
    if (bulkEditForm.accessoryCollectedNotes) {
      updates.accessoryCollectedNotes = bulkEditForm.accessoryCollectedNotes
    }
    
    if (Object.keys(updates).length === 0) {
      error.value = 'Please fill at least one field to update or check a "Clear" option'
      return
    }
    
    const result = await post('/api/tickets/bulk-edit', {
      ticketIds: selectedTicketIds.value,
      updates
    })
    
    if (result.success) {
      // Close modal and reload
      if (bulkEditModal) bulkEditModal.hide()
      resetBulkEditForm()
      clearSelection()
      await loadTickets()
      await loadStats()
      error.value = null
    }
  } catch (err) {
    console.error('Failed to bulk edit tickets:', err)
    error.value = err.message || 'Failed to bulk edit tickets'
  }
}

// Confirm bulk delete
const confirmBulkDelete = () => {
  const count = selectedTicketIds.value.length
  if (confirm(`Are you sure you want to delete ${count} ticket(s)? This action cannot be undone.`)) {
    performBulkDelete()
  }
}

// Perform bulk delete
const performBulkDelete = async () => {
  try {
    const result = await post('/api/tickets/bulk-delete', {
      ticketIds: selectedTicketIds.value
    })
    
    if (result.success) {
      clearSelection()
      await loadTickets()
      await loadStats()
      error.value = null
    }
  } catch (err) {
    console.error('Failed to bulk delete tickets:', err)
    error.value = err.message || 'Failed to bulk delete tickets'
  }
}

// Reset bulk edit form
const resetBulkEditForm = () => {
  Object.assign(bulkEditForm, {
    location: '',
    table: '',
    order: '',
    buyer: '',
    buyerDocument: '',
    buyerEmail: '',
    checkedIn: false,
    checkedInAt: '',
    accessoryCollected: false,
    accessoryCollectedAt: '',
    accessoryCollectedNotes: '',
    clearLocation: false,
    clearTable: false,
    clearOrder: false,
    clearBuyer: false,
    clearBuyerDocument: false,
    clearBuyerEmail: false
  })
}

// Load data on mount
onMounted(async () => {
  if (isAuthenticated.value) {
    await Promise.all([
      loadEvent(),
      loadTickets(),
      loadStats()
    ])
  }
})
</script>

<style scoped>
.breadcrumb {
  background: none;
  padding: 0;
}

.table th {
  font-weight: 600;
}

.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
}

.card {
  transition: transform 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-2px);
}

.table-responsive {
  border-radius: 0.375rem;
  overflow: hidden;
}

.modal-body {
  max-height: 70vh;
  overflow-y: auto;
}

/* DataTable Customization */
:deep(.customize-table) {
  --easy-table-border: 1px solid #dee2e6;
  --easy-table-row-border: 1px solid #dee2e6;
  --easy-table-header-font-size: 14px;
  --easy-table-header-height: 50px;
  --easy-table-header-font-color: #fff;
  --easy-table-header-background-color: #212529;
  --easy-table-body-row-font-size: 14px;
  --easy-table-body-row-height: 60px;
  --easy-table-body-row-hover-font-color: #212529;
  --easy-table-body-row-hover-background-color: #f8f9fa;
  --easy-table-footer-background-color: #fff;
  --easy-table-footer-font-color: #212529;
  --easy-table-footer-font-size: 14px;
  --easy-table-footer-padding: 10px 10px;
  --easy-table-footer-height: 50px;
}

:deep(.customize-table .header-text) {
  font-weight: 600;
}

:deep(.customize-table tbody tr:nth-child(even)) {
  background-color: #f8f9fa;
}

/* Clickable Order Badge */
.order-link {
  cursor: pointer;
  transition: all 0.2s ease;
}

.order-link:hover {
  background-color: #0dcaf0 !important;
  transform: scale(1.05);
}
</style>
