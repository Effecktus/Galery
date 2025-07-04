// Глобальные переменные
let exhibitionCurrentSort = {
  column: 'id',
  direction: 'asc'
};

$(document).ready(function () {
  // Загрузка выставок при загрузке страницы
  loadExhibitions();

  // Загрузка списка произведений
  loadArtworks();

  // Переменная для хранения таймера
  let searchTimer;

  // Обработчик поиска при вводе
  $('#searchInput').on('input', function () {
    const searchTerm = $(this).val();

    // Очищаем предыдущий таймер
    clearTimeout(searchTimer);

    // Устанавливаем новый таймер
    searchTimer = setTimeout(() => {
      loadExhibitions(searchTerm);
    }, 300); // Задержка 300мс
  });

  // Обработчики фильтрации
  $('#dateFrom, #dateTo').on('change', function() {
    loadExhibitions();
  });

  $('#statusFilter').on('change', function() {
    loadExhibitions();
  });

  $('#priceFrom, #priceTo').on('input', function() {
    loadExhibitions();
  });

  // Обработчики очистки отдельных фильтров
  $('#clearDateFilter').on('click', function() {
    $('#dateFrom').val('');
    $('#dateTo').val('');
    loadExhibitions();
  });

  $('#clearStatusFilter').on('click', function() {
    $('#statusFilter').val([]);
    loadExhibitions();
  });

  $('#clearPriceFilter').on('click', function() {
    $('#priceFrom').val('');
    $('#priceTo').val('');
    loadExhibitions();
  });

  // Обработчик клика по заголовкам таблицы
  $('.sortable').on('click', function() {
    const column = $(this).data('column');

    if (exhibitionCurrentSort.column === column) {
      exhibitionCurrentSort.direction = exhibitionCurrentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      exhibitionCurrentSort.column = column;
      exhibitionCurrentSort.direction = 'asc';
    }

    loadExhibitions($('#searchInput').val());
  });

  // Обработчик добавления выставки
  $('#saveExhibitionBtn').off('click').on('click', function(e) {
    e.preventDefault();    const errors = validateAddExhibitionForm();
    if (errors.length) { showErrors(errors); return; }

    const formData = new FormData();
    formData.append('title', $('#exhibitionTitle').val().trim());
    formData.append('location', $('#exhibitionLocation').val().trim());
    formData.append('start_date', $('#exhibitionStartDate').val());
    formData.append('end_date', $('#exhibitionEndDate').val());
    formData.append('opening_time', $('#exhibitionOpeningTime').val());
    formData.append('closing_time', $('#exhibitionClosingTime').val());
    formData.append('status', $('#exhibitionStatus').val());
    formData.append('ticket_price', parseFloat($('#exhibitionTicketPrice').val()));
    formData.append('total_tickets', parseInt($('#exhibitionTotalTickets').val(), 10));
    formData.append('description', $('#exhibitionDescription').val().trim());

    // Правильная передача массива artwork_ids[]
    const artworkIds = getCheckedArtworkIds('#exhibitionArtworksCheckboxes');
    artworkIds.forEach(id => formData.append('artwork_ids[]', id));

    const posterFile = $('#exhibitionPoster')[0].files[0];
    if (posterFile) {
      formData.append('poster', posterFile);
      // и под хранить poster_path, чтобы express-validator не жаловался:
      formData.append('poster_path', '/media/' + posterFile.name);
    }
    // Логи для отладки
    console.group('Exhibition FormData');
    for (const [key, value] of formData.entries()) console.log(key, value);
    console.groupEnd();

    addExhibition(formData);
  });
  // Обработчик обновления выставки
  $('#updateExhibitionBtn').on('click', function () {
    const errors = validateEditExhibitionForm();
    if (errors.length > 0) {
      showErrors(errors);
      return;
    }
    const id = $('#editExhibitionId').val();
    const formData = new FormData();
    formData.append('title', $('#editExhibitionTitle').val().trim());
    formData.append('location', $('#editExhibitionLocation').val().trim());
    formData.append('start_date', $('#editExhibitionStartDate').val());
    formData.append('end_date', $('#editExhibitionEndDate').val());
    formData.append('opening_time', $('#editExhibitionOpeningTime').val());
    formData.append('closing_time', $('#editExhibitionClosingTime').val());
    formData.append('status', $('#editExhibitionStatus').val());
    formData.append('ticket_price', parseFloat($('#editExhibitionTicketPrice').val()));
    formData.append('total_tickets', parseInt($('#editExhibitionTotalTickets').val()));
    formData.append('description', $('#editExhibitionDescription').val().trim());
    getCheckedArtworkIds('#editExhibitionArtworksCheckboxes')
        .forEach(id => formData.append('artwork_ids[]', id));    const posterFile = $('#editExhibitionPoster')[0].files[0];
    if (posterFile) {
      formData.append('poster', posterFile);
    }
    updateExhibition(id, formData);
  });

  // Предпросмотр афиши при выборе файла (добавление)
  $('#exhibitionPoster').on('change', function() {
    const file = this.files[0];
    const preview = $('#addPosterPreview');
    preview.empty();
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        preview.html(`<img src="${e.target.result}" alt="Preview" style="max-width: 100%;">`);
      };
      reader.readAsDataURL(file);
    }
  });
  // Предпросмотр афиши при выборе файла (редактирование)
  $('#editExhibitionPoster').on('change', function() {
    const file = this.files[0];
    const preview = $('#editPosterPreview');
    preview.empty();
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        preview.html(`<img src="${e.target.result}" alt="Preview" style="max-width: 100%;">`);
      };
      reader.readAsDataURL(file);
    }
  });

  // Обработчик удаления выставки
  $('#confirmDeleteBtn').on('click', function () {
    const id = $(this).data('exhibitionId');
    if (id) {
      deleteExhibition(id);
    }
  });

  // Делегирование: клик по строке таблицы
  $('#exhibitionsTableBody').on('click', '.exhibition-row', function(e) {
    if ($(e.target).closest('button').length || $(e.target).hasClass('poster-thumbnail')) return;
    const exhibitionId = $(this).data('exhibition-id');
    showExhibitionDetails(exhibitionId);
  });

  // Делегирование: клик по миниатюре афиши
  $('#exhibitionsTableBody').on('click', '.poster-thumbnail', function(e) {
    e.stopPropagation();
    const posterUrl = $(this).data('full-poster');
    $('#previewImage').attr('src', posterUrl);
    $('#imagePreviewModal').addClass('active');
    $('body').addClass('modal-open');
  });

  // Добавляем обработчик предпросмотра афиши
  $('.poster-thumbnail').on('click', function(e) {
    e.stopPropagation();
    const posterUrl = $(this).data('full-poster');
    $('#previewImage').attr('src', posterUrl);
    $('#imagePreviewModal').addClass('active');
    $('body').addClass('modal-open');
  });

  // Лайтбокс для увеличения изображений (афиша и картины)
  $('.content-container').on('click', '.exhibition-poster-detail, .artwork-thumbnail-detail', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const src = $(this).data('full-image') || $(this).attr('src');
    $('#lightbox-img').attr('src', src);
    $('#image-lightbox').css('display', 'flex');
  });
  
  // Закрытие лайтбокса по клику на фон
  $('#image-lightbox').on('click', function(e) {
    if (e.target === this) {
      $(this).css('display', 'none');
      $('#lightbox-img').attr('src', '');
    }
  });
  
  // Закрытие лайтбокса по клавише Escape
  $(document).on('keydown', function(e) {
    if (e.key === 'Escape') {
      $('#image-lightbox').css('display', 'none');
      $('#lightbox-img').attr('src', '');
      $('#imagePreviewModal').removeClass('active');
      $('#previewImage').attr('src', '');
      $('body').removeClass('modal-open');
    }
  });
});

// Функция загрузки выставок
function loadExhibitions(searchTerm = "") {
  // Получаем значения всех фильтров
  const dateFrom = $('#dateFrom').val();
  const dateTo = $('#dateTo').val();
  const statusFilter = $('#statusFilter').val();
  const priceFrom = $('#priceFrom').val();
  const priceTo = $('#priceTo').val();

  // Формируем параметры запроса
  const params = new URLSearchParams();
  if (searchTerm) {
    params.append('search', searchTerm.trim());
  }
  if (dateFrom) {
    params.append('start_date', dateFrom);
  }
  if (dateTo) {
    params.append('end_date', dateTo);
  }
  if (statusFilter && statusFilter.length > 0) {
    statusFilter.forEach(status => {
      params.append('status', status);
    });
  }
  if (priceFrom) {
    params.append('min_price', priceFrom);
  }
  if (priceTo) {
    params.append('max_price', priceTo);
  }

  const queryString = params.toString();
  const url = `/api/v1/exhibitions${queryString ? `?${queryString}` : ""}`;

  $.ajax({
    url: url,
    method: 'GET',
    success: function(response) {
      if (response.status === "success") {
        const tbody = $('#exhibitionsTableBody');
        tbody.empty();

        let exhibitions = response.data.exhibitions;
        exhibitions.sort((a, b) => {
          let valueA, valueB;

          switch(exhibitionCurrentSort.column) {
            case 'id':
              valueA = a.id;
              valueB = b.id;
              break;
            case 'title':
              valueA = a.title.toLowerCase();
              valueB = b.title.toLowerCase();
              break;
            case 'location':
              valueA = a.location.toLowerCase();
              valueB = b.location.toLowerCase();
              break;
            case 'start_date':
              valueA = new Date(a.start_date);
              valueB = new Date(b.start_date);
              break;
            case 'end_date':
              valueA = new Date(a.end_date);
              valueB = new Date(b.end_date);
              break;
            case 'status':
              valueA = a.status.toLowerCase();
              valueB = b.status.toLowerCase();
              break;
            case 'ticket_price':
              valueA = a.ticket_price;
              valueB = b.ticket_price;
              break;
            default:
              valueA = a.id;
              valueB = b.id;
              break;
          }

          if (exhibitionCurrentSort.direction === 'asc') {
            return valueA > valueB ? 1 : -1;
          } else {
            return valueA < valueB ? 1 : -1;
          }
        });

        exhibitions.forEach(function(exhibition) {
          // Преобразуем путь к афише
          const posterPath = exhibition.poster_path ? exhibition.poster_path.split('/').pop() : '';
          const posterUrl = posterPath ? `/media/${posterPath}` : '';
          const posterCell = posterUrl ? `<img src="${posterUrl}" alt="Афиша" class="poster-thumbnail" data-full-poster="${posterUrl}" style="max-width: 60px; max-height: 60px; cursor: pointer;">` : '';
          const row = `
            <tr class="exhibition-row" data-exhibition-id="${exhibition.id}">
              <td>${exhibition.id}</td>
              <td>${posterCell}</td>
              <td>${exhibition.title}</td>
              <td>${exhibition.location}</td>
              <td>${formatDate(exhibition.start_date)}</td>
              <td>${formatDate(exhibition.end_date)}</td>
              <td>${formatStatus(exhibition.status)}</td>
              <td>${exhibition.ticket_price} ₽</td>
              <td>${exhibition.remaining_tickets}/${exhibition.total_tickets}</td>
              <td>
                <button class="btn btn-sm btn-primary me-2" onclick="editExhibition(${exhibition.id})">
                  <i class="fas fa-edit"></i>Изменить
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete(${exhibition.id})">
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
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else {
        alert("Ошибка при загрузке выставок");
      }
    }
  });
}

// --- Новый способ выбора картин через чекбоксы ---
function renderArtworksCheckboxes(artworks, containerId, selectedIds = []) {
  const container = $(containerId);
  container.empty();
  artworks.forEach(artwork => {
    const checked = selectedIds.includes(artwork.id) ? 'checked' : '';
    // ФИО автора полностью
    const author = artwork.Author;
    const authorFio = [author.surname, author.first_name, author.patronymic].filter(Boolean).join(' ');
    const label = `${artwork.title} (${authorFio})`;
    // Выровнять чекбоксы по правому краю
    const checkbox = `<label class="artwork-checkbox-item" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;cursor:pointer;gap:8px;">
      <span style="flex:1;">${label}</span>
      <input type="checkbox" value="${artwork.id}" style="margin-left:8px;width:18px;height:18px;" ${checked} />
    </label>`;
    container.append(checkbox);
  });
}

function getCheckedArtworkIds(containerId) {
  return $(containerId + ' input[type="checkbox"]:checked')
    .map(function() { return Number($(this).val()); })
    .get();
}

// --- Переопределяю loadArtworks ---
function loadArtworks(selectedAdd = [], selectedEdit = []) {
  $.ajax({
    url: '/api/v1/artworks',
    method: 'GET',
    success: function(response) {
      if (response.status === "success") {
        const artworks = response.data.artworks;
        renderArtworksCheckboxes(artworks, '#exhibitionArtworksCheckboxes', selectedAdd);
        renderArtworksCheckboxes(artworks, '#editExhibitionArtworksCheckboxes', selectedEdit);
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else {
        alert("Ошибка при загрузке списка произведений");
      }
    }
  });
}

// Функция добавления выставки
function addExhibition(formData) {
  $.ajax({
    url: '/api/v1/exhibitions',
    method: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    success: function(response) {
      if (response.status === "success") {
        $('#addExhibitionModal').removeClass('active');
        clearErrors();
        $('#addExhibitionForm')[0].reset();
        $('#exhibitionPoster').val('');
        $('#addPosterPreview').empty();
        loadExhibitions();
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          showErrors(response.errors);
        } else {
          alert(response.message || "Ошибка при добавлении выставки");
        }
      } else {
        alert("Ошибка при добавлении выставки");
      }
    }
  });
}

// Функция редактирования выставки
function editExhibition(id) {
  clearErrors();
  $.ajax({
    url: `/api/v1/exhibitions/${id}`,
    method: 'GET',
    success: function(response) {
      if (response.status === "success") {
        const exhibition = response.data.exhibition;

        $('#editExhibitionId').val(exhibition.id);
        $('#editExhibitionTitle').val(exhibition.title);
        $('#editExhibitionLocation').val(exhibition.location);
        $('#editExhibitionStartDate').val(formatDateForInput(exhibition.start_date));
        $('#editExhibitionEndDate').val(formatDateForInput(exhibition.end_date));
        $('#editExhibitionOpeningTime').val(exhibition.opening_time ? exhibition.opening_time.slice(0,5) : '10:00');
        $('#editExhibitionClosingTime').val(exhibition.closing_time ? exhibition.closing_time.slice(0,5) : '18:00');
        $('#editExhibitionStatus').val(exhibition.status);
        $('#editExhibitionTicketPrice').val(exhibition.ticket_price);
        $('#editExhibitionDescription').val(exhibition.description);
        $('#editExhibitionTotalTickets').val(exhibition.total_tickets);
        // Устанавливаем выбранные произведения через чекбоксы
        const selectedArtworkIds = exhibition.Artworks.map(artwork => artwork.id);
        loadArtworks([], selectedArtworkIds);
        $('#editExhibitionModal').addClass('active');
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else {
        alert("Ошибка при загрузке данных выставки");
      }
    }
  });
}

// Функция обновления выставки
function updateExhibition(id, formData) {
  $.ajax({
    url: `/api/v1/exhibitions/${id}`,
    method: 'PATCH',
    data: formData,
    processData: false,
    contentType: false,
    success: function(response) {
      if (response.status === "success") {
        $('#editExhibitionModal').removeClass('active');
        clearErrors();
        $('#editExhibitionForm')[0].reset();
        $('#editExhibitionPoster').val('');
        $('#editPosterPreview').empty();
        loadExhibitions();
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          showErrors(response.errors);
        } else {
          alert(response.message || "Ошибка при обновлении выставки");
        }
      } else {
        alert("Ошибка при обновлении выставки");
      }
    }
  });
}

// Функция удаления выставки
function deleteExhibition(id) {
  $.ajax({
    url: `/api/v1/exhibitions/${id}`,
    method: 'DELETE',
    success: function(response) {
      if (response.status === "success") {
        $('#deleteExhibitionModal').removeClass('active');
        loadExhibitions();
      } else {
        alert(response.message || "Ошибка при удалении выставки");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.data && response.data.tickets) {
          alert("Невозможно удалить выставку: на неё были забронированы билеты");
        } else {
          alert(response.message || "Невозможно удалить выставку");
        }
      } else if (xhr.status === 404) {
        alert("Выставка не найдена");
      } else {
        alert("Ошибка при удалении выставки");
      }
    }
  });
}

// Функция подтверждения удаления
function confirmDelete(id) {
  $('#confirmDeleteBtn').data('exhibitionId', id);
  $('#deleteExhibitionModal').addClass('active');
}

// Вспомогательные функции форматирования
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU');
}

function formatDateForInput(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

function formatStatus(status) {
  const statusMap = {
    'upcoming': 'Запланирована',
    'active': 'Идёт',
    'completed': 'Завершена'
  };
  return statusMap[status] || status;
}

// Функция для отображения детальной информации о выставке
function showExhibitionDetails(id) {
  $.ajax({
    url: `/api/v1/exhibitions/${id}`,
    method: 'GET',
    success: function(response) {
      if (response.status === "success") {
        const exhibition = response.data.exhibition;

        // Заполняем основную информацию
        $('#detailId').text(exhibition.id);
        $('#detailTitle').text(exhibition.title);
        $('#detailLocation').text(exhibition.location);
        $('#detailStartDate').text(formatDate(exhibition.start_date));
        $('#detailEndDate').text(formatDate(exhibition.end_date));
        $('#detailWorkingHours').text(`${formatTime(exhibition.opening_time)} - ${formatTime(exhibition.closing_time)}`);
        $('#detailStatus').text(formatStatus(exhibition.status));
        $('#detailTicketPrice').text(`${exhibition.ticket_price} ₽`);
        $('#detailDescription').text(exhibition.description || 'Нет описания');

        // Заполняем список произведений
        const artworksList = exhibition.Artworks.map(artwork => {
          const authorName = artwork.Author ?
            `${artwork.Author.surname} ${artwork.Author.first_name} ${artwork.Author.patronymic}` :
            'Автор не указан';
          return `<div class="artwork-item">
            <strong>${artwork.title}</strong> (${authorName})
            <br>
            <small>Год создания: ${artwork.creation_year}</small>
          </div>`;
        }).join('');
        $('#detailArtworks').html(artworksList || 'Нет произведений');

        // Заполняем статистику по билетам
        const ticketsInfo = `Всего билетов: ${exhibition.total_tickets}, Доступно: ${exhibition.remaining_tickets}`;
        $('#detailTickets').html(ticketsInfo);

        // Показываем модальное окно
        $('#exhibitionDetailsModal').addClass('active');
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else {
        alert("Ошибка при загрузке информации о выставке");
      }
    }
  });
}

// Функция для очистки ошибок
function clearErrors() {
  $('.error-message').text('');
  $('.form-group').removeClass('error');
  $('.form-group input, .form-group select, .form-group textarea').removeClass('error');
}

// Функция для отображения ошибок
function showErrors(errors) {
  clearErrors();
  if (errors && errors.length > 0) {
    errors.forEach(error => {
      const field = error.field;
      const message = error.message;
      const formGroup = $(`#${field}`).closest('.form-group');
      formGroup.addClass('error');
      $(`#${field}`).addClass('error');
      $(`#${field}Error`).text(message);
    });
  }
}

// Функция валидации формы добавления выставки
function validateAddExhibitionForm() {
  const title = $('#exhibitionTitle').val().trim();
  const location = $('#exhibitionLocation').val().trim();
  const start_date = $('#exhibitionStartDate').val();
  const end_date = $('#exhibitionEndDate').val();
  const opening_time = $('#exhibitionOpeningTime').val();
  const closing_time = $('#exhibitionClosingTime').val();
  const status = $('#exhibitionStatus').val();
  const ticket_price = $('#exhibitionTicketPrice').val();
  const total_tickets = $('#exhibitionTotalTickets').val();
  const description = $('#exhibitionDescription').val().trim();
  const artwork_ids = getCheckedArtworkIds('#exhibitionArtworksCheckboxes');

  const errors = [];

  if (!title) {
    errors.push({ field: 'exhibitionTitle', message: 'Название обязательно' });
  } else if (title.length < 2 || title.length > 100) {
    errors.push({ field: 'exhibitionTitle', message: 'Название должно быть от 2 до 100 символов' });
  }

  if (!location) {
    errors.push({ field: 'exhibitionLocation', message: 'Место проведения обязательно' });
  } else if (location.length < 2 || location.length > 100) {
    errors.push({ field: 'exhibitionLocation', message: 'Место проведения должно быть от 2 до 100 символов' });
  }

  if (!start_date) {
    errors.push({ field: 'exhibitionStartDate', message: 'Дата начала обязательна' });
  }

  if (!end_date) {
    errors.push({ field: 'exhibitionEndDate', message: 'Дата окончания обязательна' });
  } else if (start_date && new Date(end_date) <= new Date(start_date)) {
    errors.push({ field: 'exhibitionEndDate', message: 'Дата окончания должна быть позже даты начала' });
  }

  if (!opening_time) {
    errors.push({ field: 'exhibitionOpeningTime', message: 'Время открытия обязательно' });
  }

  if (!closing_time) {
    errors.push({ field: 'exhibitionClosingTime', message: 'Время закрытия обязательно' });
  }

  if (opening_time && closing_time && opening_time >= closing_time) {
    errors.push({ field: 'exhibitionClosingTime', message: 'Время закрытия должно быть позже времени открытия' });
  }

  if (!status) {
    errors.push({ field: 'exhibitionStatus', message: 'Статус обязателен' });
  } else if (!['upcoming', 'active', 'completed'].includes(status)) {
    errors.push({ field: 'exhibitionStatus', message: 'Неверный статус выставки' });
  }

  if (!ticket_price) {
    errors.push({ field: 'exhibitionTicketPrice', message: 'Цена билета обязательна' });
  } else {
    const price = parseFloat(ticket_price);
    if (isNaN(price) || price < 0) {
      errors.push({ field: 'exhibitionTicketPrice', message: 'Цена билета должна быть положительным числом' });
    }
  }

  if (!total_tickets) {
    errors.push({ field: 'exhibitionTotalTickets', message: 'Общее количество билетов обязательно' });
  } else if (isNaN(parseInt(total_tickets)) || parseInt(total_tickets) < 1) {
    errors.push({ field: 'exhibitionTotalTickets', message: 'Общее количество билетов должно быть положительным числом' });
  }

  if (description && description.length > 2000) {
    errors.push({ field: 'exhibitionDescription', message: 'Описание не должно превышать 2000 символов' });
  }

  if (!artwork_ids || artwork_ids.length === 0) {
    errors.push({ field: 'exhibitionArtworksCheckboxes', message: 'Выберите хотя бы одно произведение искусства' });
  }
  const posterFile = $('#exhibitionPoster')[0].files[0];
  if (!posterFile) {
    errors.push({
      field: 'exhibitionPoster',
      message: 'Афиша обязательна'
    });
  }
  return errors;
}

// Функция валидации формы редактирования выставки
function validateEditExhibitionForm() {
  const title = $('#editExhibitionTitle').val().trim();
  const location = $('#editExhibitionLocation').val().trim();
  const start_date = $('#editExhibitionStartDate').val();
  const end_date = $('#editExhibitionEndDate').val();
  const opening_time = $('#editExhibitionOpeningTime').val();
  const closing_time = $('#editExhibitionClosingTime').val();
  const status = $('#editExhibitionStatus').val();
  const ticket_price = $('#editExhibitionTicketPrice').val();
  const total_tickets = $('#editExhibitionTotalTickets').val();
  const description = $('#editExhibitionDescription').val().trim();
  const artwork_ids = getCheckedArtworkIds('#editExhibitionArtworksCheckboxes');

  const errors = [];

  if (!title) {
    errors.push({ field: 'editExhibitionTitle', message: 'Название обязательно' });
  } else if (title.length < 2 || title.length > 100) {
    errors.push({ field: 'editExhibitionTitle', message: 'Название должно быть от 2 до 100 символов' });
  }

  if (!location) {
    errors.push({ field: 'editExhibitionLocation', message: 'Место проведения обязательно' });
  } else if (location.length < 2 || location.length > 100) {
    errors.push({ field: 'editExhibitionLocation', message: 'Место проведения должно быть от 2 до 100 символов' });
  }

  if (!start_date) {
    errors.push({ field: 'editExhibitionStartDate', message: 'Дата начала обязательна' });
  }

  if (!end_date) {
    errors.push({ field: 'editExhibitionEndDate', message: 'Дата окончания обязательна' });
  } else if (start_date && new Date(end_date) <= new Date(start_date)) {
    errors.push({ field: 'editExhibitionEndDate', message: 'Дата окончания должна быть позже даты начала' });
  }

  if (!opening_time) {
    errors.push({ field: 'editExhibitionOpeningTime', message: 'Время открытия обязательно' });
  }

  if (!closing_time) {
    errors.push({ field: 'editExhibitionClosingTime', message: 'Время закрытия обязательно' });
  }

  if (opening_time && closing_time && opening_time >= closing_time) {
    errors.push({ field: 'editExhibitionClosingTime', message: 'Время закрытия должно быть позже времени открытия' });
  }

  if (!status) {
    errors.push({ field: 'editExhibitionStatus', message: 'Статус обязателен' });
  } else if (!['upcoming', 'active', 'completed'].includes(status)) {
    errors.push({ field: 'editExhibitionStatus', message: 'Неверный статус выставки' });
  }

  if (!ticket_price) {
    errors.push({ field: 'editExhibitionTicketPrice', message: 'Цена билета обязательна' });
  } else {
    const price = parseFloat(ticket_price);
    if (isNaN(price) || price < 0) {
      errors.push({ field: 'editExhibitionTicketPrice', message: 'Цена билета должна быть положительным числом' });
    }
  }

  if (!total_tickets) {
    errors.push({ field: 'editExhibitionTotalTickets', message: 'Общее количество билетов обязательно' });
  } else if (isNaN(parseInt(total_tickets)) || parseInt(total_tickets) < 1) {
    errors.push({ field: 'editExhibitionTotalTickets', message: 'Общее количество билетов должно быть положительным числом' });
  }

  if (description && description.length > 2000) {
    errors.push({ field: 'editExhibitionDescription', message: 'Описание не должно превышать 2000 символов' });
  }

  if (!artwork_ids || artwork_ids.length === 0) {
    errors.push({ field: 'editExhibitionArtworksCheckboxes', message: 'Выберите хотя бы одно произведение искусства' });
  }

  return errors;
}

// Добавляем очистку ошибок при открытии модальных окон
$('[data-modal="addExhibitionModal"]').on('click', function() {
  clearErrors();
  loadArtworks();
});

// Закрытие предпросмотра афиши (только по клику вне изображения и по Esc)
$('#imagePreviewModal').on('click', function(e) {
  if ($(e.target).is('#imagePreviewModal')) {
    $('#imagePreviewModal').removeClass('active');
    $('#previewImage').attr('src', '');
    $('body').removeClass('modal-open');
  }
});
$(document).on('keydown', function(e) {
  if (e.key === 'Escape') {
    $('#imagePreviewModal').removeClass('active');
    $('#previewImage').attr('src', '');
    $('body').removeClass('modal-open');
  }
});

