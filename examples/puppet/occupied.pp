# Include in your own module after installing the integration and CLI release.
# Provision token_file separately with mode 0600; never put the token in argv.
class occupied::managed (
  String $program_yaml,
  String $entry_id,
  String $ha_url,
  String $config_dir = '/srv/homeassistant',
  String $owner = 'homeassistant',
  String $group = 'homeassistant',
  String $cli = '/opt/occupied/bin/occupied-config',
  String $token_file = '/etc/occupied/ha.token',
  String $timezone = 'Europe/Stockholm',
  Float $latitude = 59.3293,
  Float $longitude = 18.0686,
) {
  file { "${config_dir}/occupied":
    ensure => directory,
    owner  => $owner,
    group  => $group,
    mode   => '0750',
  }

  file { "${config_dir}/occupied/house.yaml":
    ensure           => file,
    owner            => $owner,
    group            => $group,
    mode             => '0640',
    content          => $program_yaml,
    validate_cmd     => "${cli} validate % --date today --days 7 --seed deploy --timezone ${timezone} --latitude ${latitude} --longitude ${longitude}",
    staging_location => "${config_dir}/occupied/house.yaml.candidate",
    require          => File["${config_dir}/occupied"],
  }

  exec { 'reload-occupied-managed-file':
    command     => [$cli, 'reload', '--url', $ha_url, '--entry-id', $entry_id, '--token-file', $token_file],
    refreshonly => true,
    subscribe   => File["${config_dir}/occupied/house.yaml"],
    timeout     => 30,
    logoutput   => on_failure,
  }
}
