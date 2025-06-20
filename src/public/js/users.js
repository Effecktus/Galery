// Глобальные переменные
let userCurrentSort = {
  column: 'id',
  direction: 'asc'
};

$(document).ready(function () {
  // Загрузка пользователей при загрузке страницы
  loadUsers();

  // Переменная для хранения таймера
  let searchTimer;

  // Обработчик поиска при вводе
  $('#searchInput').on('input', function () {
    const searchTerm = $(this).val();
    
    // Очищаем предыдущий таймер
    clearTimeout(searchTimer);
    
    // Устанавливаем новый таймер
    searchTimer = setTimeout(() => {
      loadUsers(searchTerm);
    }, 300); // Задержка 300мс
  });

  // Обработчик клика по заголовкам таблицы
  $('.sortable').on('click', function() {
    const column = $(this).data('column');
    
    // Если кликнули по текущему столбцу, меняем направление
    if (userCurrentSort.column === column) {
      userCurrentSort.direction = userCurrentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Если кликнули по новому столбцу, устанавливаем сортировку по возрастанию
      userCurrentSort.column = column;
      userCurrentSort.direction = 'asc';
    }

    // Перезагружаем данные
    loadUsers($('#searchInput').val());
  });

  // Обработчик добавления пользователя
  $('#saveUserBtn').on('click', function () {
    const errors = validateAddUserForm();
    if (errors.length > 0) {
      showErrors(errors);
      return;
    }

    const surname = $('#userSurname').val();
    const first_name = $('#userFirstName').val();
    const patronymic = $('#userPatronymic').val();
    const email = $('#userEmail').val();
    const password = $('#userPassword').val();
    const role = $('#userRole').val();

    addUser(surname, first_name, patronymic, email, password, role);
  });

  // Обработчик обновления пользователя
  $('#updateUserBtn').on('click', function () {
    const errors = validateEditUserForm();
    if (errors.length > 0) {
      showErrors(errors);
      return;
    }

    const id = $('#editUserId').val();
    const surname = $('#editUserSurname').val();
    const first_name = $('#editUserFirstName').val();
    const patronymic = $('#editUserPatronymic').val();
    const email = $('#editUserEmail').val();
    const password = $('#editUserPassword').val();
    const role = $('#editUserRole').val();

    updateUser(id, surname, first_name, patronymic, email, password, role);
  });

  // Обработчик удаления пользователя
  $('#confirmDeleteBtn').on('click', function () {
    const id = $(this).data('userId');
    if (id) {
      deleteUser(id);
    }
  });
});

// Функция загрузки пользователей
function loadUsers(searchTerm = "") {
  $.ajax({
    url: `/api/v1/users${searchTerm ? `?name=${searchTerm}` : ""}`,
    method: 'GET',
    success: function(response) {
      if (response.status === "success") {
        const tbody = $('#usersTableBody');
        tbody.empty();

        // Сортируем данные на клиенте
        let users = response.data.users;
        users.sort((a, b) => {
          let valueA, valueB;
          
          switch(userCurrentSort.column) {
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
              valueA = (a.patronymic || '').toLowerCase();
              valueB = (b.patronymic || '').toLowerCase();
              break;
            case 'email':
              valueA = a.email.toLowerCase();
              valueB = b.email.toLowerCase();
              break;
            case 'role':
              valueA = a.role.toLowerCase();
              valueB = b.role.toLowerCase();
              break;
            case 'tickets':
              valueA = a.statistics.total_tickets;
              valueB = b.statistics.total_tickets;
              break;
            default:
              valueA = a.surname.toLowerCase();
              valueB = b.surname.toLowerCase();
              break;
          }

          if (userCurrentSort.direction === 'asc') {
            return valueA > valueB ? 1 : -1;
          } else {
            return valueA < valueB ? 1 : -1;
          }
        });

        users.forEach(function(user) {
          const row = `
            <tr>
              <td>${user.id}</td>
              <td>${user.surname}</td>
              <td>${user.first_name}</td>
              <td>${user.patronymic || ''}</td>
              <td>${user.email}</td>
              <td>${user.role}</td>
              <td>${user.statistics.total_tickets}</td>
              <td>
                <button class="btn btn-sm btn-primary me-2" onclick="editUser(${user.id}, 
                  '${user.surname}', '${user.first_name}', '${user.patronymic || ''}', 
                  '${user.email}', '${user.role}')">
                  <i class="fas fa-edit"></i>Изменить
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete(${user.id})">
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
        alert("Ошибка при загрузке пользователей");
      }
    }
  });
}

// Функция для очистки ошибок
function clearErrors() {
  $('.error-message').text('');
  $('.form-group').removeClass('error');
  $('.form-group input, .form-group select').removeClass('error');
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

// Функция валидации формы добавления пользователя
function validateAddUserForm() {
  const surname = $('#userSurname').val().trim();
  const first_name = $('#userFirstName').val().trim();
  const patronymic = $('#userPatronymic').val().trim();
  const email = $('#userEmail').val().trim();
  const password = $('#userPassword').val();
  const passwordConfirm = $('#userPasswordConfirm').val();
  const role = $('#userRole').val();

  const errors = [];

  if (!surname) {
    errors.push({ field: 'userSurname', message: 'Фамилия обязательна' });
  } else if (surname.length < 2 || surname.length > 50) {
    errors.push({ field: 'userSurname', message: 'Фамилия должна быть от 2 до 50 символов' });
  }

  if (!first_name) {
    errors.push({ field: 'userFirstName', message: 'Имя обязательно' });
  } else if (first_name.length < 2 || first_name.length > 50) {
    errors.push({ field: 'userFirstName', message: 'Имя должно быть от 2 до 50 символов' });
  }

  if (patronymic && (patronymic.length < 2 || patronymic.length > 50)) {
    errors.push({ field: 'userPatronymic', message: 'Отчество должно быть от 2 до 50 символов' });
  }

  if (!email) {
    errors.push({ field: 'userEmail', message: 'Email обязателен' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'userEmail', message: 'Неверный формат email' });
  }

  if (!password) {
    errors.push({ field: 'userPassword', message: 'Пароль обязателен' });
  } else if (password.length < 8) {
    errors.push({ field: 'userPassword', message: 'Пароль должен быть не менее 8 символов' });
  }

  if (!passwordConfirm) {
    errors.push({ field: 'userPasswordConfirm', message: 'Подтверждение пароля обязательно' });
  } else if (password !== passwordConfirm) {
    errors.push({ field: 'userPasswordConfirm', message: 'Пароли не совпадают' });
  }

  if (!role) {
    errors.push({ field: 'userRole', message: 'Роль обязательна' });
  }

  return errors;
}

// Функция валидации формы редактирования пользователя
function validateEditUserForm() {
  const surname = $('#editUserSurname').val().trim();
  const first_name = $('#editUserFirstName').val().trim();
  const patronymic = $('#editUserPatronymic').val().trim();
  const email = $('#editUserEmail').val().trim();
  const password = $('#editUserPassword').val();
  const passwordConfirm = $('#editUserPasswordConfirm').val();
  const role = $('#editUserRole').val();

  const errors = [];

  if (!surname) {
    errors.push({ field: 'editUserSurname', message: 'Фамилия обязательна' });
  } else if (surname.length < 2 || surname.length > 50) {
    errors.push({ field: 'editUserSurname', message: 'Фамилия должна быть от 2 до 50 символов' });
  }

  if (!first_name) {
    errors.push({ field: 'editUserFirstName', message: 'Имя обязательно' });
  } else if (first_name.length < 2 || first_name.length > 50) {
    errors.push({ field: 'editUserFirstName', message: 'Имя должно быть от 2 до 50 символов' });
  }

  if (patronymic && (patronymic.length < 2 || patronymic.length > 50)) {
    errors.push({ field: 'editUserPatronymic', message: 'Отчество должно быть от 2 до 50 символов' });
  }

  if (!email) {
    errors.push({ field: 'editUserEmail', message: 'Email обязателен' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'editUserEmail', message: 'Неверный формат email' });
  }

  if (password) {
    if (password.length < 8) {
      errors.push({ field: 'editUserPassword', message: 'Пароль должен быть не менее 8 символов' });
    }
    if (!passwordConfirm) {
      errors.push({ field: 'editUserPasswordConfirm', message: 'Подтверждение пароля обязательно' });
    } else if (password !== passwordConfirm) {
      errors.push({ field: 'editUserPasswordConfirm', message: 'Пароли не совпадают' });
    }
  }

  if (!role) {
    errors.push({ field: 'editUserRole', message: 'Роль обязательна' });
  }

  return errors;
}

// Функция добавления пользователя
function addUser(surname, first_name, patronymic, email, password, role) {
  $.ajax({
    url: '/api/v1/users',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ surname, first_name, patronymic, email, password, role }),
    success: function(response) {
      if (response.status === "success") {
        $('#addUserModal').removeClass('active');
        clearErrors();
        $('#userSurname').val('');
        $('#userFirstName').val('');
        $('#userPatronymic').val('');
        $('#userEmail').val('');
        $('#userPassword').val('');
        $('#userRole').val('user');
        loadUsers();
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
          alert(response.message || "Ошибка при добавлении пользователя");
        }
      } else {
        alert("Ошибка при добавлении пользователя");
      }
    }
  });
}

// Функция редактирования пользователя
function editUser(id, surname, first_name, patronymic, email, role) {
  clearErrors();
  $('#editUserId').val(id);
  $('#editUserSurname').val(surname);
  $('#editUserFirstName').val(first_name);
  $('#editUserPatronymic').val(patronymic);
  $('#editUserEmail').val(email);
  $('#editUserPassword').val(''); // Очищаем поле пароля
  $('#editUserRole').val(role);
  $('#editUserModal').addClass('active');
}

// Функция обновления пользователя
function updateUser(id, surname, first_name, patronymic, email, password, role) {
  // Преобразуем пустую строку в null для отчества
  const patronymicValue = patronymic.trim() === '' ? null : patronymic;
  
  const data = { 
    surname, 
    first_name, 
    patronymic: patronymicValue, 
    email, 
    role 
  };
  if (password) {
    data.password = password;
  }

  $.ajax({
    url: `/api/v1/users/${id}`,
    method: 'PATCH',
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function(response) {
      if (response.status === "success") {
        $('#editUserModal').removeClass('active');
        clearErrors();
        loadUsers();
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
          alert(response.message || "Ошибка при обновлении пользователя");
        }
      } else {
        alert("Ошибка при обновлении пользователя");
      }
    }
  });
}

// Функция удаления пользователя
function deleteUser(id) {
  $.ajax({
    url: `/api/v1/users/${id}`,
    method: 'DELETE',
    success: function(response) {
      if (response.status === "success") {
        $('#deleteUserModal').removeClass('active');
        loadUsers();
      } else {
        alert(response.message || "Ошибка при удалении пользователя");
      }
    },
    error: function(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.data && response.data.ticketCount) {
          alert(`Невозможно удалить пользователя: у него есть ${response.data.ticketCount} забронированных билетов`);
        } else {
          alert(response.message || "Невозможно удалить пользователя");
        }
      } else if (xhr.status === 404) {
        alert("Пользователь не найден");
      } else {
        alert("Ошибка при удалении пользователя");
      }
    }
  });
}

// Функция подтверждения удаления
function confirmDelete(id) {
  $('#confirmDeleteBtn').data('userId', id);
  $('#deleteUserModal').addClass('active');
}

// Добавляем очистку ошибок при открытии модальных окон
$('[data-modal="addUserModal"]').on('click', function() {
  clearErrors();
});