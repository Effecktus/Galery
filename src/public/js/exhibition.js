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
  $('#saveExhibitionBtn').on('click', function () {
    const formData = {
      title: $('#exhibitionTitle').val().trim(),
      location: $('#exhibitionLocation').val().trim(),
      start_date: $('#exhibitionStartDate').val(),
      end_date: $('#exhibitionEndDate').val(),
      status: $('#exhibitionStatus').val(),
      ticket_price: parseFloat($('#exhibitionTicketPrice').val()),
      description: $('#exhibitionDescription').val().trim(),
      artwork_ids: Array.from($('#exhibitionArtworks').val()).map(Number)
    };

    addExhibition(formData);
  });

  // Обработчик обновления выставки
  $('#updateExhibitionBtn').on('click', function () {
    const id = $('#editExhibitionId').val();
    const formData = {
      title: $('#editExhibitionTitle').val().trim(),
      location: $('#editExhibitionLocation').val().trim(),
      start_date: $('#editExhibitionStartDate').val(),
      end_date: $('#editExhibitionEndDate').val(),
      status: $('#editExhibitionStatus').val(),
      ticket_price: parseFloat($('#editExhibitionTicketPrice').val()),
      description: $('#editExhibitionDescription').val().trim(),
      artwork_ids: Array.from($('#editExhibitionArtworks').val()).map(Number)
    };

    updateExhibition(id, formData);
  });

  // Обработчик удаления выставки
  $('#confirmDeleteBtn').on('click', function () {
    const id = $(this).data('exhibitionId');
    if (id) {
      deleteExhibition(id);
    }
  });
});

// Функция загрузки выставок
function loadExhibitions(searchTerm = "") {
  $.ajax({
    url: `/api/v1/exhibitions${searchTerm ? `?search=${searchTerm}` : ""}`,
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
          const row = `
            <tr class="exhibition-row" data-exhibition-id="${exhibition.id}">
              <td>${exhibition.id}</td>
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

        // Добавляем обработчик клика по строке
        $('.exhibition-row').on('click', function(e) {
          // Игнорируем клик по кнопкам действий
          if (!$(e.target).closest('button').length) {
            const exhibitionId = $(this).data('exhibition-id');
            showExhibitionDetails(exhibitionId);
          }
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

// Функция загрузки произведений искусства
function loadArtworks() {
  $.ajax({
    url: '/api/v1/artworks',
    method: 'GET',
    success: function(response) {
      if (response.status === "success") {
        const artworks = response.data.artworks;
        const artworkSelects = $('#exhibitionArtworks, #editExhibitionArtworks');
        
        artworkSelects.empty();
        artworks.forEach(function(artwork) {
          const option = `<option value="${artwork.id}">${artwork.title} (${artwork.Author.surname} ${artwork.Author.first_name})</option>`;
          artworkSelects.append(option);
        });
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
    success: function(response) {
      if (response.status === "success") {
        $('#addExhibitionModal').removeClass('active');
        $('#addExhibitionForm')[0].reset();
        loadExhibitions();
      } else {
        alert(response.message || "Ошибка при добавлении выставки");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          const errorMessage = response.errors.map(err => err.msg).join('\n');
          alert(errorMessage);
        } else if (response.message) {
          alert(response.message);
        } else {
          alert("Ошибка при добавлении выставки");
        }
      } else {
        alert("Ошибка при добавлении выставки");
      }
    }
  });
}

// Функция редактирования выставки
function editExhibition(id) {
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
        $('#editExhibitionStatus').val(exhibition.status);
        $('#editExhibitionTicketPrice').val(exhibition.ticket_price);
        $('#editExhibitionDescription').val(exhibition.description);
        
        // Устанавливаем выбранные произведения
        const selectedArtworkIds = exhibition.Artworks.map(artwork => artwork.id);
        $('#editExhibitionArtworks').val(selectedArtworkIds);
        
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
    success: function(response) {
      if (response.status === "success") {
        $('#editExhibitionModal').removeClass('active');
        $('#editExhibitionForm')[0].reset();
        loadExhibitions();
      } else {
        alert(response.message || "Ошибка при обновлении выставки");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          const errorMessage = response.errors.map(err => err.msg).join('\n');
          alert(errorMessage);
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
    'planned': 'Запланирована',
    'active': 'Активна',
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
