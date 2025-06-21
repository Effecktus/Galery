// Глобальные переменные
let ticketCurrentSort = {
  column: 'id',
  direction: 'asc'
};

$(document).ready(function () {
  loadTickets();
  loadUsers();
  loadExhibitions();

  let searchTimer;

  // Поиск
  $('#searchTicketInput').on('input', function () {
    const searchTerm = $(this).val();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      loadTickets(searchTerm);
    }, 300);
  });

  // Обработчики фильтрации
  $('#bookingDateFrom, #bookingDateTo').on('change', function() {
    loadTickets();
  });

  $('#priceFrom, #priceTo').on('input', function() {
    loadTickets();
  });

  // Обработчики очистки отдельных фильтров
  $('#clearBookingDateFilter').on('click', function() {
    $('#bookingDateFrom').val('');
    $('#bookingDateTo').val('');
    loadTickets();
  });

  $('#clearPriceFilter').on('click', function() {
    $('#priceFrom').val('');
    $('#priceTo').val('');
    loadTickets();
  });

  // Сортировка
  $('.sortable').on('click', function() {
    const column = $(this).data('column');
    if (ticketCurrentSort.column === column) {
      ticketCurrentSort.direction = ticketCurrentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      ticketCurrentSort.column = column;
      ticketCurrentSort.direction = 'asc';
    }
    loadTickets($('#searchTicketInput').val());
  });

  // Открытие модального окна добавления
  $('[data-modal="addTicketModal"]').on('click', function() {
    clearTicketErrors();
    $('#addTicketForm')[0].reset();
    $('#addTicketModal').addClass('active');
  });

  // Закрытие модальных окон
  $('.modal-close').on('click', function() {
    $(this).closest('.modal').removeClass('active');
  });

  // Добавление билета
  $('#saveTicketBtn').on('click', function () {
    const errors = validateTicketForm('add');
    if (errors.length > 0) {
      showTicketErrors(errors, 'add');
      return;
    }
    const data = {
      user_id: $('#ticketUser').val(),
      exhibition_id: $('#ticketExhibition').val(),
      quantity: $('#ticketQuantity').val()
    };
    $.ajax({
      url: '/api/v1/tickets',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function(response) {
        if (response.status === 'success') {
          $('#addTicketModal').removeClass('active');
          loadTickets();
        }
      },
      error: function(xhr) {
        if (xhr.status === 400) {
          const response = xhr.responseJSON;
          if (response.errors && response.errors.length > 0) {
            showTicketErrors(response.errors, 'add');
          } else {
            alert(response.message || 'Ошибка при добавлении билета');
          }
        } else {
          alert('Ошибка при добавлении билета');
        }
      }
    });
  });

  // Открытие модального окна редактирования
  $(document).on('click', '.edit-ticket-btn', function() {
    clearTicketErrors();
    const id = $(this).data('id');
    $.ajax({
      url: `/api/v1/tickets/${id}`,
      method: 'GET',
      success: function(response) {
        if (response.status === 'success') {
          const ticket = response.data.ticket;
          $('#editTicketId').val(ticket.id);
          $('#editTicketUser').val(ticket.user_id);
          $('#editTicketExhibition').val(ticket.exhibition_id);
          $('#editTicketQuantity').val(ticket.quantity);
          $('#editTicketModal').addClass('active');
        }
      },
      error: function() {
        alert('Ошибка при загрузке данных билета');
      }
    });
  });

  // Сохранение изменений билета
  $('#updateTicketBtn').on('click', function () {
    const errors = validateTicketForm('edit');
    if (errors.length > 0) {
      showTicketErrors(errors, 'edit');
      return;
    }
    const id = $('#editTicketId').val();
    const data = {
      user_id: $('#editTicketUser').val(),
      exhibition_id: $('#editTicketExhibition').val(),
      quantity: $('#editTicketQuantity').val()
    };
    $.ajax({
      url: `/api/v1/tickets/${id}`,
      method: 'PATCH',
      contentType: 'application/json',
      data: JSON.stringify(data),
      success: function(response) {
        if (response.status === 'success') {
          $('#editTicketModal').removeClass('active');
          loadTickets();
        }
      },
      error: function(xhr) {
        if (xhr.status === 400) {
          const response = xhr.responseJSON;
          if (response.errors && response.errors.length > 0) {
            showTicketErrors(response.errors, 'edit');
          } else {
            alert(response.message || 'Ошибка при обновлении билета');
          }
        } else {
          alert('Ошибка при обновлении билета');
        }
      }
    });
  });

  // Открытие модального окна удаления
  $(document).on('click', '.delete-ticket-btn', function() {
    const id = $(this).data('id');
    $('#confirmDeleteTicketBtn').data('ticketId', id);
    $('#deleteTicketModal').addClass('active');
  });

  // Подтверждение удаления
  $('#confirmDeleteTicketBtn').on('click', function () {
    const id = $(this).data('ticketId');
    $.ajax({
      url: `/api/v1/tickets/${id}`,
      method: 'DELETE',
      success: function(response) {
        if (response.status === 'success') {
          $('#deleteTicketModal').removeClass('active');
          loadTickets();
        } else {
          alert(response.message || 'Ошибка при удалении билета');
        }
      },
      error: function(xhr) {
        alert('Ошибка при удалении билета');
      }
    });
  });
});

// Загрузка билетов
function loadTickets(searchTerm = "") {
  // Получаем значения всех фильтров
  const bookingDateFrom = $('#bookingDateFrom').val();
  const bookingDateTo = $('#bookingDateTo').val();
  const priceFrom = $('#priceFrom').val();
  const priceTo = $('#priceTo').val();
  
  // Формируем параметры запроса
  const params = new URLSearchParams();
  if (searchTerm) {
    params.append('search', searchTerm.trim());
  }
  if (bookingDateFrom) {
    params.append('booking_date_from', bookingDateFrom);
  }
  if (bookingDateTo) {
    params.append('booking_date_to', bookingDateTo);
  }
  if (priceFrom) {
    params.append('min_price', priceFrom);
  }
  if (priceTo) {
    params.append('max_price', priceTo);
  }
  
  const queryString = params.toString();
  const url = `/api/v1/tickets${queryString ? `?${queryString}` : ""}`;

  $.ajax({
    url: url,
    method: 'GET',
    success: function(response) {
      if (response.status === 'success') {
        const tbody = $('#ticketsTableBody');
        tbody.empty();
        let tickets = response.data.tickets;
        tickets.sort((a, b) => {
          let valueA, valueB;
          switch(ticketCurrentSort.column) {
            case 'id':
              valueA = a.id;
              valueB = b.id;
              break;
            case 'user':
              valueA = `${a.User.surname} ${a.User.first_name} ${a.User.patronymic}`.toLowerCase();
              valueB = `${b.User.surname} ${b.User.first_name} ${b.User.patronymic}`.toLowerCase();
              break;
            case 'exhibition':
              valueA = a.Exhibition.title.toLowerCase();
              valueB = b.Exhibition.title.toLowerCase();
              break;
            case 'booking_date':
              valueA = new Date(a.booking_date);
              valueB = new Date(b.booking_date);
              break;
            case 'total_price':
              valueA = a.total_price;
              valueB = b.total_price;
              break;
            case 'quantity':
              valueA = a.quantity;
              valueB = b.quantity;
              break;
            default:
              valueA = a.id;
              valueB = b.id;
              break;
          }
          if (ticketCurrentSort.direction === 'asc') {
            return valueA > valueB ? 1 : -1;
          } else {
            return valueA < valueB ? 1 : -1;
          }
        });
        tickets.forEach(function(ticket) {
          const row = `
            <tr>
              <td>${ticket.id}</td>
              <td>${ticket.User.surname} ${ticket.User.first_name} ${ticket.User.patronymic}</td>
              <td>${ticket.Exhibition.title}</td>
              <td>${formatDate(ticket.booking_date)}</td>
              <td>${ticket.total_price}</td>
              <td>${ticket.quantity}</td>
              <td>
                <button class="btn btn-sm btn-primary me-2 edit-ticket-btn" data-id="${ticket.id}">
                  <i class="fas fa-edit"></i>Изменить
                </button>
                <button class="btn btn-sm btn-danger delete-ticket-btn" data-id="${ticket.id}">
                  <i class="fas fa-trash"></i>Удалить
                </button>
              </td>
            </tr>
          `;
          tbody.append(row);
        });
      }
    },
    error: function(xhr) {
      alert('Ошибка при загрузке билетов');
    }
  });
}

// Загрузка пользователей для выпадающего списка
function loadUsers() {
  $.ajax({
    url: '/api/v1/users',
    method: 'GET',
    success: function(response) {
      if (response.status === 'success') {
        const users = response.data.users;
        const userSelects = $('#ticketUser, #editTicketUser');
        userSelects.empty();
        users.forEach(function(user) {
          const option = `<option value="${user.id}">${user.surname} ${user.first_name} ${user.patronymic}</option>`;
          userSelects.append(option);
        });
      }
    }
  });
}

// Загрузка выставок для выпадающего списка
function loadExhibitions() {
  $.ajax({
    url: '/api/v1/exhibitions',
    method: 'GET',
    success: function(response) {
      if (response.status === 'success') {
        const exhibitions = response.data.exhibitions;
        const exhibitionSelects = $('#ticketExhibition, #editTicketExhibition');
        exhibitionSelects.empty();
        exhibitions.forEach(function(exhibition) {
          const option = `<option value="${exhibition.id}">${exhibition.title}</option>`;
          exhibitionSelects.append(option);
        });
      }
    }
  });
}

// Форматирование даты
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Очистка ошибок
function clearTicketErrors() {
  $('.error-message').text('');
  $('.form-group').removeClass('error');
  $('.form-group input, .form-group select').removeClass('error');
}

// Отображение ошибок
function showTicketErrors(errors, prefix) {
  clearTicketErrors();
  if (errors && errors.length > 0) {
    errors.forEach(error => {
      const field = error.field;
      const message = error.message;
      const formGroup = $(`#${prefix}Ticket${capitalizeFirst(field)}`).closest('.form-group');
      formGroup.addClass('error');
      $(`#${prefix}Ticket${capitalizeFirst(field)}`).addClass('error');
      $(`#${prefix}Ticket${capitalizeFirst(field)}Error`).text(message);
    });
  }
}

// Валидация формы билета
function validateTicketForm(prefix) {
  const user_id = $(`#${prefix}TicketUser`).val();
  const exhibition_id = $(`#${prefix}TicketExhibition`).val();
  const quantity = $(`#${prefix}TicketQuantity`).val();
  const errors = [];
  if (!user_id) {
    errors.push({ field: 'User', message: 'Выберите пользователя' });
  }
  if (!exhibition_id) {
    errors.push({ field: 'Exhibition', message: 'Выберите выставку' });
  }
  if (!quantity || isNaN(quantity) || quantity <= 0) {
    errors.push({ field: 'Quantity', message: 'Введите корректное количество' });
  }
  return errors;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
