// Глобальные переменные
let stylesCurrentSort = {
  column: 'id',
  direction: 'asc'
};

$(document).ready(function () {
  // Загрузка стилей при загрузке страницы
  loadStyles();

  // Обработчик открытия модального окна добавления
  $('[data-modal="addStyleModal"]').on('click', function() {
    $('#addStyleModal').addClass('active');
    setTimeout(() => {
      clearErrors('addStyleForm');
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
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      loadStyles(searchTerm);
    }, 300);
  });

  // Обработчик клика по заголовкам таблицы
  $('.sortable').on('click', function() {
    const column = $(this).data('column');
    
    // Если кликнули по текущему столбцу, меняем направление
    if (stylesCurrentSort.column === column) {
      stylesCurrentSort.direction = stylesCurrentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Если кликнули по новому столбцу, устанавливаем сортировку по возрастанию
      stylesCurrentSort.column = column;
      stylesCurrentSort.direction = 'asc';
    }

    // Перезагружаем данные
    loadStyles($('#searchInput').val());
  });

  // Обработчик добавления стиля
  $('#saveStyleBtn').on('click', function () {
    if (validateStyleForm('addStyleForm', 'styleName')) {
      const name = $('#styleName').val();
      addStyle(name);
    }
  });

  // Обработчик обновления стиля
  $('#updateStyleBtn').on('click', function () {
    if (validateStyleForm('editStyleForm', 'editStyleName')) {
      const id = $('#editStyleId').val();
      const name = $('#editStyleName').val();
      updateStyle(id, name);
    }
  });

  // Обработчик удаления стиля
  $('#confirmDeleteBtn').on('click', function () {
    const id = $(this).data('styleId');
    if (id) {
      deleteStyle(id);
    }
  });
});

// Функция загрузки стилей
function loadStyles(searchTerm="") {
  $.ajax({
    url: `/api/v1/styles${searchTerm ? `?name=${searchTerm}` : ""}`,
    method: 'GET',
    success: function(response) {
      if(response.status === "success") {
        const tbody = $('#stylesTableBody');
        tbody.empty();

        // Сортировка данных на клиенте
        let styles = response.data.styles;
        styles.sort((a, b) => {
          let valueA, valueB;

          switch (stylesCurrentSort.column) {
            case 'id':
              valueA = a.id;
              valueB = b.id;
              break;
            case 'name':
              valueA = a.name.toLowerCase();
              valueB = b.name.toLowerCase();
              break;
            case 'artworks':
              valueA = a.statistics?.total_artworks;
              valueB = b.statistics?.total_artworks;
              break;
            default:
              valueA = a.name.toLowerCase();
              valueB = b.name.toLowerCase();
              break;
          }

          if (stylesCurrentSort.direction === 'asc') {
            return valueA > valueB ? 1 : -1;
          } else {
            return valueA < valueB ? 1 : -1;
          }
        });

        styles.forEach(function (style) {
          const row = `
            <tr>
              <td>${style.id}</td>
              <td>${style.name}</td>
              <td>${style.statistics?.total_artworks}</td>
              <td>
                <button class="btn btn-sm btn-primary me-2 edit-style-btn" data-id="${style.id}" data-name="${style.name}">
                  <i class="fas fa-edit"></i> Изменить
                </button>
                <button class="btn btn-sm btn-danger delete-style-btn" data-id="${style.id}">
                  <i class="fas fa-trash"></i> Удалить
                </button>
              </td>
            </tr>
          `;
          tbody.append(row);
        });

        // Добавляем обработчики для кнопок после добавления строк в таблицу
        $('.edit-style-btn').on('click', function() {
          const id = $(this).data('id');
          const name = $(this).data('name');
          editStyle(id, name);
        });

        $('.delete-style-btn').on('click', function() {
          const id = $(this).data('id');
          confirmDelete(id);
        });
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else {
        alert("Ошибка при загрузке стилей");
      }
    }
  });
}

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
function validateStyleForm(formId, nameFieldId) {
  const name = document.getElementById(nameFieldId).value.trim();
  let isValid = true;

  clearErrors(formId);

  if (!name) {
    showError(formId, nameFieldId, 'Название стиля обязательно');
    isValid = false;
  } else if (name.length < 2 || name.length > 50) {
    showError(formId, nameFieldId, 'Название должно быть от 2 до 50 символов');
    isValid = false;
  }

  return isValid;
}

// Функция добавления стиля
function addStyle(name) {
  $.ajax({
    url: '/api/v1/styles',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ name }),
    success: function(response) {
      if (response.status === "success") {
        $('#addStyleModal').removeClass('active');
        $('#styleName').val('');
        clearErrors('addStyleForm');
        loadStyles();
      } else {
        showError('addStyleForm', 'styleName', response.message || "Ошибка при добавлении стиля");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          response.errors.forEach(error => {
            showError('addStyleForm', 'styleName', error.message);
          });
        } else {
          showError('addStyleForm', 'styleName', response.message || "Ошибка при добавлении стиля");
        }
      } else {
        showError('addStyleForm', 'styleName', "Ошибка при добавлении стиля");
      }
    }
  });
}

// Функция редактирования стиля
window.editStyle = function(id, name) {
  clearErrors('editStyleForm');
  $('#editStyleId').val(id);
  $('#editStyleName').val(name);
  $('#editStyleModal').addClass('active');
};

// Функция обновления стиля
function updateStyle(id, name) {
  $.ajax({
    url: `/api/v1/styles/${id}`,
    method: 'PATCH',
    contentType: 'application/json',
    data: JSON.stringify({ name }),
    success: function(response) {
      if (response.status === "success") {
        $('#editStyleModal').removeClass('active');
        clearErrors('editStyleForm');
        loadStyles();
      } else {
        showError('editStyleForm', 'editStyleName', response.message || "Ошибка при обновлении стиля");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          response.errors.forEach(error => {
            showError('editStyleForm', 'editStyleName', error.message);
          });
        } else {
          showError('editStyleForm', 'editStyleName', response.message || "Ошибка при обновлении стиля");
        }
      } else {
        showError('editStyleForm', 'editStyleName', "Ошибка при обновлении стиля");
      }
    }
  });
}

// Функция удаления стиля
function deleteStyle(id) {
  $.ajax({
    url: `/api/v1/styles/${id}`,
    method: 'DELETE',
    success: function(response) {
      if (response.status === "success") {
        // Закрываем модальное окно
        $('#deleteStyleModal').removeClass('active');

        // Перезагружаем список стилей
        loadStyles();
      } else {
        alert(response.message || "Ошибка при удалении стиля");
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
          alert(`Невозможно удалить стиль: он используется в ${response.data.artworksCount} произведениях`);
        } else {
          alert(response?.message || "Невозможно удалить стиль");
        }
      } else if (xhr.status === 404) {
        alert("Стиль не найден");
      } else {
        alert("Ошибка при удалении стиля");
      }
    }
  });
}

// Функция подтверждения удаления
window.confirmDelete = function(id) {
  $('#confirmDeleteBtn').data('styleId', id);
  $('#deleteStyleModal').addClass('active');
};