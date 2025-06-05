// Глобальные переменные
let stylesCurrentSort = {
  column: 'id',
  direction: 'asc'
};

$(document).ready(function () {
  // Загрузка стилей при загрузке страницы
  loadStyles();

  // Переменная для хранения таймера
  let searchTimer;

  // Обработчик поиска при вводе
  $('#searchInput').on('input', function () {
    const searchTerm = $(this).val();
    
    // Очищаем предыдущий таймер
    clearTimeout(searchTimer);
    
    // Устанавливаем новый таймер
    searchTimer = setTimeout(() => {
      loadStyles(searchTerm);
    }, 300); // Задержка 300мс
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
    const name = $('#styleName').val();
    if (name) {
      addStyle(name);
    }
  });

  // Обработчик обновления стиля
  $('#updateStyleBtn').on('click', function () {
    const id = $('#editStyleId').val();
    const name = $('#editStyleName').val();
    if (id && name) {
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
                <button class="btn btn-sm btn-primary me-2" onclick="editStyle(${style.id}, '${style.name}')">
                  <i class="fas fa-edit"></i>Изменить
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete(${style.id})">
                  <i class="fas fa-trash"></i>Удалить
                </button>
              </td>
            </tr>
          `;
          tbody.append(row);
        });
      }
    },
    error: function(xhr, status, error) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else {
        alert("Ошибка при загрузке стилей");
      }
    }
  });
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
        // Закрываем модальное окно и очищаем форму
        $('#addStyleModal').removeClass('active');
        $('#styleName').val('');

        // Перезагружаем список стилей
        loadStyles();
      } else {
        alert(response.message || "Ошибка при добавлении стиля");
      }
    },
    error: function(xhr, status, error) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else {
        alert("Ошибка при добавлении стиля");
      }
    }
  });
}

// Функция редактирования стиля
window.editStyle = function(id, name) {
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
        // Закрываем модальное окно
        $('#editStyleModal').removeClass('active');

        // Перезагружаем список стилей
        loadStyles();
      } else {
        alert(response.message || "Ошибка при обновлении стиля");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else {
        alert("Ошибка при обновлении стиля");
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
          // Обработка ошибок валидации
          const errorMessage = response.errors.map(err => err.msg).join('\n');
          alert(errorMessage);
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