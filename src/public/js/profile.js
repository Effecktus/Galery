// Открытие модального окна и заполнение формы
$(document).ready(function () {
  $('#editProfileBtn').on('click', function () {
    // Заполнить форму текущими данными
    $('#editProfileSurname').val($('#profileSurname').text());
    $('#editProfileFirstName').val($('#profileFirstName').text());
    $('#editProfilePatronymic').val($('#profilePatronymic').text());
    $('#editProfileEmail').val($('#profileEmail').text());
    $('#editProfilePassword').val('');
    $('#editProfilePasswordConfirm').val('');
    clearErrors();
    $('#editProfileModal').addClass('active');
  });

  // Закрытие модального окна
  $('.modal-close').on('click', function () {
    $(this).closest('.modal').removeClass('active');
  });

  // Сохранить изменения
  $('#saveProfileBtn').on('click', function () {
    const errors = validateProfileForm();
    if (errors.length > 0) {
      showErrors(errors);
      return;
    }
    updateProfile();
  });
});

function clearErrors() {
  $('.error-message').text('');
  $('.form-group').removeClass('error');
  $('.form-group input').removeClass('error');
}

function showErrors(errors) {
  clearErrors();
  if (errors && errors.length > 0) {
    errors.forEach(error => {
      const field = error.field;
      const message = error.message;
      const formGroup = $('#' + field).closest('.form-group');
      formGroup.addClass('error');
      $('#' + field).addClass('error');
      $('#' + field + 'Error').text(message);
    });
  }
}

function validateProfileForm() {
  const surname = $('#editProfileSurname').val().trim();
  const first_name = $('#editProfileFirstName').val().trim();
  const patronymic = $('#editProfilePatronymic').val().trim();
  const email = $('#editProfileEmail').val().trim();
  const password = $('#editProfilePassword').val();
  const passwordConfirm = $('#editProfilePasswordConfirm').val();

  const errors = [];

  if (!surname) {
    errors.push({ field: 'editProfileSurname', message: 'Фамилия обязательна' });
  } else if (surname.length < 2 || surname.length > 50) {
    errors.push({ field: 'editProfileSurname', message: 'Фамилия должна быть от 2 до 50 символов' });
  }

  if (!first_name) {
    errors.push({ field: 'editProfileFirstName', message: 'Имя обязательно' });
  } else if (first_name.length < 2 || first_name.length > 50) {
    errors.push({ field: 'editProfileFirstName', message: 'Имя должно быть от 2 до 50 символов' });
  }

  if (patronymic && (patronymic.length < 2 || patronymic.length > 50)) {
    errors.push({ field: 'editProfilePatronymic', message: 'Отчество должно быть от 2 до 50 символов' });
  }

  if (!email) {
    errors.push({ field: 'editProfileEmail', message: 'Email обязателен' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'editProfileEmail', message: 'Неверный формат email' });
  }

  if (password) {
    if (password.length < 8) {
      errors.push({ field: 'editProfilePassword', message: 'Пароль должен быть не менее 8 символов' });
    }
    if (!passwordConfirm) {
      errors.push({ field: 'editProfilePasswordConfirm', message: 'Подтверждение пароля обязательно' });
    } else if (password !== passwordConfirm) {
      errors.push({ field: 'editProfilePasswordConfirm', message: 'Пароли не совпадают' });
    }
  }

  return errors;
}

function updateProfile() {
  const surname = $('#editProfileSurname').val().trim();
  const first_name = $('#editProfileFirstName').val().trim();
  const patronymic = $('#editProfilePatronymic').val().trim();
  const email = $('#editProfileEmail').val().trim();
  const password = $('#editProfilePassword').val();

  const data = {
    surname,
    first_name,
    patronymic: patronymic === '' ? null : patronymic,
    email
  };
  if (password) {
    data.password = password;
  }

  $.ajax({
    url: '/api/v1/users/me',
    method: 'PATCH',
    contentType: 'application/json',
    data: JSON.stringify(data),
    success: function (response) {
      if (response.status === 'success') {
        // Обновить данные на странице
        $('#profileSurname').text(response.data.user.surname);
        $('#profileFirstName').text(response.data.user.first_name);
        $('#profilePatronymic').text(response.data.user.patronymic);
        $('#profileEmail').text(response.data.user.email);
        $('#editProfileModal').removeClass('active');
        clearErrors();
        // Можно добавить уведомление об успехе
        alert('Профиль успешно обновлен');
      }
    },
    error: function (xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const response = xhr.responseJSON;
        if (response.errors && response.errors.length > 0) {
          showErrors(response.errors);
        } else {
          alert(response.message || 'Ошибка при обновлении профиля');
        }
      } else {
        alert('Ошибка при обновлении профиля');
      }
    }
  });
} 