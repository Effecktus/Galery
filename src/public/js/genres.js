// Глобальные переменные
let genreCurrentSort = {
  column: 'id',
  direction: 'asc'
};

$(document).ready(function () {
  // Загрузка жанров при загрузке страницы
  loadGenres();

  // Обработчик открытия модального окна добавления
  $('[data-modal="addGenreModal"]').on('click', function() {
    $('#addGenreModal').addClass('active');
    setTimeout(() => {
      clearErrors('addGenreForm');
    }, 0);
  });

  // Обработчик закрытия модальных окон
  $('.modal-close').on('click', function() {
    $(this).closest('.modal').removeClass('active');
  });

  // Переменная для хранения таймера
  let searchTimer;

  // Обработчик поиска при вводе
  $('#searchInput').on('input', function () {
    const searchTerm = $(this).val();
    
    // Очищаем предыдущий таймер
    clearTimeout(searchTimer);
    
    // Устанавливаем новый таймер
    searchTimer = setTimeout(() => {
      loadGenres(searchTerm);
    }, 300); // Задержка 300мс
  });

  // Обработчик клика по заголовкам таблицы
  $('.sortable').on('click', function() {
    const column = $(this).data('column');
    
    // Если кликнули по текущему столбцу, меняем направление
    if (genreCurrentSort.column === column) {
      genreCurrentSort.direction = genreCurrentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Если кликнули по новому столбцу, устанавливаем сортировку по возрастанию
      genreCurrentSort.column = column;
      genreCurrentSort.direction = 'asc';
    }

    // Перезагружаем данные
    loadGenres($('#searchInput').val());
  });

  // Обработчик добавления жанра
  $('#saveGenreBtn').on('click', function () {
    if (validateGenreForm('addGenreForm', 'genreName')) {
      const name = $('#genreName').val();
      addGenre(name);
    }
  });

  // Обработчик обновления жанра
  $('#updateGenreBtn').on('click', function () {
    if (validateGenreForm('editGenreForm', 'editGenreName')) {
      const id = $('#editGenreId').val();
      const name = $('#editGenreName').val();
      updateGenre(id, name);
    }
  });

  // Обработчик удаления жанра
  $('#confirmDeleteBtn').on('click', function () {
    const id = $(this).data('genreId');
    if (id) {
      deleteGenre(id);
    }
  });
});

// Функция для очистки ошибок
function clearErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  const errorContainer = document.getElementById(formId + 'Error');
  const errorMessages = form.querySelectorAll('.error-message');
  const formGroups = form.querySelectorAll('.form-group');

  if (errorContainer) errorContainer.classList.remove('active');
  if (errorContainer) errorContainer.textContent = '';
  errorMessages.forEach(msg => msg.textContent = '');
  formGroups.forEach(group => group.classList.remove('error'));
}

// Функция для отображения ошибок
function showError(formId, fieldName, message) {
  const form = document.getElementById(formId);
  const field = form.querySelector(`#${fieldName}`);
  const formGroup = field.closest('.form-group');
  const errorMessage = formGroup.querySelector('.error-message');
  const errorContainer = document.getElementById(formId + 'Error');

  formGroup.classList.add('error');
  errorMessage.textContent = message;
  errorContainer.textContent = 'Пожалуйста, исправьте ошибки в форме';
  errorContainer.classList.add('active');
}

// Функция валидации формы
function validateGenreForm(formId, nameFieldId) {
  const name = document.getElementById(nameFieldId).value.trim();
  let isValid = true;

  clearErrors(formId);

  if (!name) {
    showError(formId, nameFieldId, 'Название жанра обязательно');
    isValid = false;
  } else if (name.length < 2 || name.length > 50) {
    showError(formId, nameFieldId, 'Название должно быть от 2 до 50 символов');
    isValid = false;
  }

  return isValid;
}

// Функция загрузки жанров
function loadGenres(searchTerm = "") {
  $.ajax({
    url: `/api/v1/genres${searchTerm ? `?name=${searchTerm}` : ""}`,
    method: 'GET',
    success: function(response) {
      if (response.status === "success") {
        const tbody = $('#genresTableBody');
        tbody.empty();

        // Сортируем данные на клиенте
        let genres = response.data.genres;
        genres.sort((a, b) => {
          let valueA, valueB;
          
          switch(genreCurrentSort.column) {
            case 'id':
              valueA = a.id;
              valueB = b.id;
              break;
            case 'name':
              valueA = a.name.toLowerCase();
              valueB = b.name.toLowerCase();
              break;
            case 'artworks':
              valueA = a.statistics.total_artworks;
              valueB = b.statistics.total_artworks;
              break;
            default:
              valueA = a.name.toLowerCase();
              valueB = b.name.toLowerCase();
              break;
          }

          if (genreCurrentSort.direction === 'asc') {
            return valueA > valueB ? 1 : -1;
          } else {
            return valueA < valueB ? 1 : -1;
          }
        });

        genres.forEach(function(genre) {
          const row = `
            <tr>
              <td>${genre.id}</td>
              <td>${genre.name}</td>
              <td>${genre.statistics.total_artworks}</td>
              <td>
                <button class="btn btn-sm btn-primary me-2 edit-genre-btn" data-id="${genre.id}" data-name="${genre.name}">
                  <i class="fas fa-edit"></i> Изменить
                </button>
                <button class="btn btn-sm btn-danger delete-genre-btn" data-id="${genre.id}">
                  <i class="fas fa-trash"></i> Удалить
                </button>
              </td>
            </tr>
          `;
          tbody.append(row);
        });

        // Добавляем обработчики для кнопок после добавления строк в таблицу
        $('.edit-genre-btn').on('click', function() {
          const id = $(this).data('id');
          const name = $(this).data('name');
          editGenre(id, name);
        });

        $('.delete-genre-btn').on('click', function() {
          const id = $(this).data('id');
          confirmDelete(id);
        });
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else {
        alert("Ошибка при загрузке жанров");
      }
    }
  });
}

// Функция добавления жанра
function addGenre(name) {
  $.ajax({
    url: '/api/v1/genres',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ name }),
    success: function(response) {
      if (response.status === "success") {
        $('#addGenreModal').removeClass('active');
        $('#genreName').val('');
        clearErrors('addGenreForm');
        loadGenres();
      } else {
        showError('addGenreForm', 'genreName', response.message || "Ошибка при добавлении жанра");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          response.errors.forEach(error => {
            showError('addGenreForm', 'genreName', error.message);
          });
        } else {
          showError('addGenreForm', 'genreName', response.message || "Ошибка при добавлении жанра");
        }
      } else {
        showError('addGenreForm', 'genreName', "Ошибка при добавлении жанра");
      }
    }
  });
}

// Функция редактирования жанра
function editGenre(id, name) {
  clearErrors('editGenreForm');
  $('#editGenreId').val(id);
  $('#editGenreName').val(name);
  $('#editGenreModal').addClass('active');
}

// Функция обновления жанра
function updateGenre(id, name) {
  $.ajax({
    url: `/api/v1/genres/${id}`,
    method: 'PATCH',
    contentType: 'application/json',
    data: JSON.stringify({ name }),
    success: function(response) {
      if (response.status === "success") {
        // Закрываем модальное окно
        $('#editGenreModal').removeClass('active');
        clearErrors('editGenreForm');
        loadGenres();
      } else {
        showError('editGenreForm', 'editGenreName', response.message || "Ошибка при обновлении жанра");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          response.errors.forEach(error => {
            showError('editGenreForm', 'editGenreName', error.message);
          });
        } else {
          showError('editGenreForm', 'editGenreName', response.message || "Ошибка при обновлении жанра");
        }
      } else {
        showError('editGenreForm', 'editGenreName', "Ошибка при обновлении жанра");
      }
    }
  });
}

// Функция удаления жанра
function deleteGenre(id) {
  $.ajax({
    url: `/api/v1/genres/${id}`,
    method: 'DELETE',
    success: function(response) {
      if (response.status === "success") {
        // Закрываем модальное окно
        $('#deleteGenreModal').removeClass('active');

        // Перезагружаем список жанров
        loadGenres();
      } else {
        alert(response.message || "Ошибка при удалении жанра");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          alert(response.errors.map(err => err.msg).join('\n'));
        } else if (response.data && response.data.artworksCount) {
          alert(`Невозможно удалить жанр: он используется в ${response.data.artworksCount} произведениях`);
        } else {
          alert(response?.message || "Невозможно удалить жанр");
        }
      } else if (xhr.status === 404) {
        alert("Жанр не найден");
      } else {
        alert("Ошибка при удалении жанра");
      }
    }
  });
}

// Функция подтверждения удаления
function confirmDelete(id) {
  $('#confirmDeleteBtn').data('genreId', id);
  $('#deleteGenreModal').addClass('active');
}