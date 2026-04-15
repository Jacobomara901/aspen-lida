#!/usr/bin/env bash
printf "\n******************************\n"
printf "Aspen LiDA Local Build\n"
printf "******************************\n"
printf "Select release channel:\n"
PS3="> "
channels=("production" "beta" "alpha" "development")
select item in "${channels[@]}"
do
    case $REPLY in
	*) channel=$item; break;;
    esac
done

readarray -t instances < <(jq -c 'keys' '../app-configs/apps.json' | jq -r '.[]')
declare -a instances
printf "Select instance:\n"
PS3="> "
select item in "${instances[@]}" all
do
  eval item=$item
    case $REPLY in
	*) slug=$item; break;;
    esac
done

printf "Select platform(s):\n"
PS3="> "
platforms=("ios" "android" "all")
select item in "${platforms[@]}"
do
    case $REPLY in
	*) osPlatform=$item; break;;
    esac
done

printf "******************************\n"
printf "Local builds run synchronously and can take 20+ minutes each.\n"
printf "Artifacts are written to ../code/ and the path is printed at the end of each build.\n"
printf "******************************\n"

run_local_build () {
  local site="$1"
  printf "\nBuilding %s in channel %s for %s platform(s)... \n" "$site" "$channel" "$osPlatform"
  node copyConfig.js --instance="$site"
  node updateConfig.js --instance="$site" --env="$channel"
  sed -i '' "s/{{APP_ENV}}/$site/g" ../code/eas.json
  cp ../app-configs/google-services.json ../code/google-services.json
  cd ../code || exit 1
  APP_ENV=$site GOOGLE_SERVICES_JSON=./google-services.json eas build --platform "$osPlatform" --profile "$channel" --local --non-interactive
  local rc=$?
  rm -f google-services.json
  cd ../scripts || exit 1
  if [[ $rc -ne 0 ]]; then
    printf "\n❌ Local build for %s failed (exit %s)\n" "$site" "$rc"
    return $rc
  fi
}

if [[ $slug == 'all' ]]
then
  readarray -t sites < <(jq -c 'keys' '../app-configs/apps.json' | jq @sh | jq -r)
  declare -a sites
  for site in ${sites[@]}
    do
      eval site=$site
      run_local_build "$site" || exit $?
    done
else
  run_local_build "$slug" || exit $?
fi

printf "******************************\n"
printf " 👌 Finished. Bye! \n"
exit
