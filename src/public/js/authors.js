// Глобальные переменные
let authorCurrentSort = {
  column: 'id',
  direction: 'asc'
};

$(document).ready(function () {
  // Загрузка авторов при загрузке страницы
  loadAuthors();

  // Переменная для хранения таймера
  let searchTimer;

  // Обработчик поиска при вводе
  $('#searchInput').on('input', function () {
    const searchTerm = $(this).val();
    
    // Очищаем предыдущий таймер
    clearTimeout(searchTimer);
    
    // Устанавливаем новый таймер
    searchTimer = setTimeout(() => {
      loadAuthors(searchTerm);
    }, 300); // Задержка 300мс
  });

  // Обработчик клика по заголовкам таблицы
  $('.sortable').on('click', function() {
    const column = $(this).data('column');
    
    // Если кликнули по текущему столбцу, меняем направление
    if (authorCurrentSort.column === column) {
      authorCurrentSort.direction = authorCurrentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Если кликнули по новому столбцу, устанавливаем сортировку по возрастанию
      authorCurrentSort.column = column;
      authorCurrentSort.direction = 'asc';
    }

    // Перезагружаем данные
    loadAuthors($('#searchInput').val());
  });

  // Обработчик добавления автора
  $('#saveAuthorBtn').on('click', function () {
    const surname = $('#authorSurname').val();
    const first_name = $('#authorFirstName').val();
    const patronymic = $('#authorPatronymic').val();
    const date_of_birth = $('#authorDateOfBirth').val();
    const date_of_death = $('#authorDateOfDeath').val();

    // Проверка на пустые поля
    if (!surname || !first_name || !patronymic || !date_of_birth || !date_of_death) {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    // Проверка дат
    if (new Date(date_of_death) <= new Date(date_of_birth)) {
      alert('Дата смерти должна быть позже даты рождения');
      return;
    }

    addAuthor(surname, first_name, patronymic, date_of_birth, date_of_death);
  });

  // Обработчик обновления автора
  $('#updateAuthorBtn').on('click', function () {
    const id = $('#editAuthorId').val();
    const surname = $('#editAuthorSurname').val();
    const first_name = $('#editAuthorFirstName').val();
    const patronymic = $('#editAuthorPatronymic').val();
    const date_of_birth = $('#editAuthorDateOfBirth').val();
    const date_of_death = $('#editAuthorDateOfDeath').val();
    if (id && surname && first_name && patronymic && date_of_birth && date_of_death) {
      updateAuthor(id, surname, first_name, patronymic, date_of_birth, date_of_death);
    }
  });

  // Обработчик удаления автора
  $('#confirmDeleteBtn').on('click', function () {
    const id = $(this).data('authorId');
    if (id) {
      deleteAuthor(id);
    }
  });
});

// Функция загрузки авторов
function loadAuthors(searchTerm = "") {
  $.ajax({
    url: `/api/v1/authors${searchTerm ? `?name=${searchTerm}` : ""}`,
    method: 'GET',
    success: function(response) {
      if (response.status === "success") {
        const tbody = $('#authorsTableBody');
        tbody.empty();

        // Сортируем данные на клиенте
        let authors = response.data.authors;
        authors.sort((a, b) => {
          let valueA, valueB;
          
          switch(authorCurrentSort.column) {
            case 'id':
              valueA = a.id;
              valueB = b.id;
              break;
            case 'surname':
              valueA = a.surname.toLowerCase();
              valueB = b.surname.toLowerCase();
              break;
            case 'first_name':
              valueA = a.first_name.toLowerCase();
              valueB = b.first_name.toLowerCase();
              break;
            case 'patronymic':
              valueA = a.patronymic.toLowerCase();
              valueB = b.patronymic.toLowerCase();
              break;
            case 'date_of_birth':
              valueA = a.date_of_birth;
              valueB = b.date_of_birth;
              break;
            case 'date_of_death':
              valueA = a.date_of_death;
              valueB = b.date_of_death;
              break;
            case 'artworks':
              valueA = a.statistics.total_artworks;
              valueB = b.statistics.total_artworks;
              break;
            default:
              valueA = a.surname.toLowerCase();
              valueB = b.surname.toLowerCase();
              break;
          }

          if (authorCurrentSort.direction === 'asc') {
            return valueA > valueB ? 1 : -1;
          } else {
            return valueA < valueB ? 1 : -1;
          }
        });

        authors.forEach(function(author) {
          const row = `
            <tr>
              <td>${author.id}</td>
              <td>${author.surname}</td>
              <td>${author.first_name}</td>
              <td>${author.patronymic}</td>
              <td>${formatDate(author.date_of_birth)}</td>
              <td>${formatDate(author.date_of_death)}</td>
              <td>${author.statistics.total_artworks}</td>
              <td>
                <button class="btn btn-sm btn-primary me-2" onclick="editAuthor(${author.id}, 
                  '${author.surname}', '${author.first_name}', '${author.patronymic}', 
                  '${author.date_of_birth}', '${author.date_of_death}')">
                  <i class="fas fa-edit"></i>Изменить
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete(${author.id})">
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
        alert("Ошибка при загрузке авторов");
      }
    }
  });
}

// Функция добавления автора
function addAuthor(surname, first_name, patronymic, date_of_birth, date_of_death) {
  $.ajax({
    url: '/api/v1/authors',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ surname, first_name, patronymic, date_of_birth, date_of_death }),
    success: function(response) {
      if (response.status === "success") {
        $('#addAuthorModal').removeClass('active');
        $('#authorSurname').val('');
        $('#authorFirstName').val('');
        $('#authorPatronymic').val('');
        $('#authorDateOfBirth').val('');
        $('#authorDateOfDeath').val('');
        loadAuthors();
      } else {
        alert(response.message || "Ошибка при добавлении автора");
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
          alert(response.message || "Ошибка при добавлении автора");
        }
      } else {
        alert("Ошибка при добавлении автора");
      }
    }
  });
}

// Функция редактирования автора
function editAuthor(id, surname, first_name, patronymic, date_of_birth, date_of_death) {
  $('#editAuthorId').val(id);
  $('#editAuthorSurname').val(surname);
  $('#editAuthorFirstName').val(first_name);
  $('#editAuthorPatronymic').val(patronymic);
  $('#editAuthorDateOfBirth').val(date_of_birth);
  $('#editAuthorDateOfDeath').val(date_of_death);
  $('#editAuthorModal').addClass('active');
}

// Функция обновления автора
function updateAuthor(id, surname, first_name, patronymic, date_of_birth, date_of_death) {
  $.ajax({
    url: `/api/v1/authors/${id}`,
    method: 'PATCH',
    contentType: 'application/json',
    data: JSON.stringify({ surname, first_name, patronymic, date_of_birth, date_of_death }),
    success: function(response) {
      if (response.status === "success") {
        // Закрываем модальное окно
        $('#editAuthorModal').removeClass('active');

        // Перезагружаем список авторов
        loadAuthors();
      } else {
        alert(response.message || "Ошибка при обновлении автора");
      }
      },
      error: function(xhr) {
        if (xhr.status === 401) {
          window.location.href = '/auth/login';
        } else {
          alert("Ошибка при обновлении автора");
        }
      }
  });
}

// Функция удаления автора
function deleteAuthor(id) {
  $.ajax({
    url: `/api/v1/authors/${id}`,
    method: 'DELETE',
    success: function(response) {
      if (response.status === "success") {
        // Закрываем модальное окно
        $('#deleteAuthorModal').removeClass('active');

        // Перезагружаем список авторов
        loadAuthors();
      } else {
        alert(response.message || "Ошибка при удалении автора");
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
          alert(`Невозможно удалить автора: он используется в ${response.data.artworksCount} произведениях`);
        } else {
          alert(response?.message || "Невозможно удалить автора");
        }
      } else if (xhr.status === 404) {
        alert("Автор не найден");
      } else {
        alert("Ошибка при удалении автора");
      }
    }
  });
}

// Функция подтверждения удаления
function confirmDelete(id) {
  $('#confirmDeleteBtn').data('authorId', id);
  $('#deleteAuthorModal').addClass('active');
} ;